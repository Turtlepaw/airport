/**
 * Centralized migration client for handling the complete migration flow
 * Used by both the UI (MigrationProgress component) and E2E tests
 */

export interface MigrationState {
  state: "up" | "issue" | "maintenance";
  message: string;
  allowMigration: boolean;
}

export interface MigrationStep {
  name: string;
  status: "pending" | "in-progress" | "verifying" | "completed" | "error";
  error?: string;
  isVerificationError?: boolean;
}

export interface MigrationParams {
  service: string;
  handle: string;
  email: string;
  password: string;
  invite?: string;
}

export interface MigrationCallbacks {
  onStepUpdate?: (stepIndex: number, step: MigrationStep) => void;
  onStateUpdate?: (state: MigrationState) => void;
  onRetryUpdate?: (stepIndex: number, attempts: number) => void;
  onShowContinueAnyway?: (stepIndex: number, show: boolean) => void;
  onIdentityTokenRequired?: () => void;
  onMigrationComplete?: () => void;
}

export interface VerificationStatus {
  ready: boolean;
  reason?: string;
  activated?: boolean;
  validDid?: boolean;
  repoCommit?: boolean;
  repoRev?: boolean;
  repoBlocks?: boolean;
  expectedRecords?: number;
  indexedRecords?: number;
  privateStateValues?: boolean;
  expectedBlobs?: number;
  importedBlobs?: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

/**
 * Centralized migration client that handles the complete migration flow
 */
export class MigrationClient {
  private baseUrl: string;
  private retryAttempts: Record<number, number> = {};
  private showContinueAnyway: Record<number, boolean> = {};
  private steps: MigrationStep[] = [
    { name: "Create Account", status: "pending" },
    { name: "Migrate Data", status: "pending" },
    { name: "Migrate Identity", status: "pending" },
    { name: "Finalize Migration", status: "pending" },
  ];

  constructor(baseUrl: string = "") {
    this.baseUrl = baseUrl;
  }

  /**
   * Start the complete migration process
   */
  async startMigration(
    params: MigrationParams,
    callbacks: MigrationCallbacks = {},
  ): Promise<boolean> {
    console.log("Starting migration with params:", {
      service: params.service,
      handle: params.handle,
      email: params.email,
      hasPassword: !!params.password,
      invite: params.invite,
    });

    // Reset state
    this.retryAttempts = {};
    this.showContinueAnyway = {};
    this.steps = [
      { name: "Create Account", status: "pending" },
      { name: "Migrate Data", status: "pending" },
      { name: "Migrate Identity", status: "pending" },
      { name: "Finalize Migration", status: "pending" },
    ];

    try {
      // Check migration state first
      const migrationState = await this.checkMigrationState();
      if (migrationState) {
        callbacks.onStateUpdate?.(migrationState);
        if (!migrationState.allowMigration) {
          this.updateStepStatus(0, "error", migrationState.message, callbacks);
          return false;
        }
      }

      // Validate parameters
      if (!this.validateParams(params, callbacks)) {
        return false;
      }

      // Start the migration flow
      return await this.executeStep1CreateAccount(params, callbacks);
    } catch (error) {
      console.error("Migration error:", error);
      this.updateStepStatus(
        0,
        "error",
        error instanceof Error ? error.message : "Unknown error occurred",
        callbacks,
      );
      return false;
    }
  }

  /**
   * Handle identity migration with token
   */
  async submitIdentityToken(
    token: string,
    callbacks: MigrationCallbacks = {},
  ): Promise<boolean> {
    if (!token) return false;

    try {
      const response = await fetch(
        `${this.baseUrl}/api/migrate/identity/sign?token=${
          encodeURIComponent(token)
        }`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );

      const responseText = await response.text();
      if (!response.ok) {
        try {
          const json = JSON.parse(responseText);
          throw new Error(
            json.message || "Failed to complete identity migration",
          );
        } catch {
          throw new Error(
            responseText || "Failed to complete identity migration",
          );
        }
      }

      let data;
      try {
        data = JSON.parse(responseText);
        if (!data.success) {
          throw new Error(data.message || "Identity migration failed");
        }
      } catch {
        throw new Error("Invalid response from server");
      }

      // Verify the identity migration succeeded
      this.updateStepStatus(2, "verifying", undefined, callbacks);
      const verified = await this.verifyStep(2, true, callbacks);
      if (!verified) {
        console.log(
          "Identity migration: Verification failed after token submission",
        );
        return false;
      }

      // Continue to finalization
      this.updateStepStatus(2, "completed", undefined, callbacks);
      return await this.executeStep4Finalization(callbacks);
    } catch (error) {
      console.error("Identity migration error:", error);
      this.updateStepStatus(
        2,
        "error",
        error instanceof Error ? error.message : String(error),
        callbacks,
      );
      return false;
    }
  }

  /**
   * Retry verification for a specific step
   */
  async retryVerification(
    stepIndex: number,
    callbacks: MigrationCallbacks = {},
  ): Promise<boolean> {
    console.log(`Retrying verification for step ${stepIndex + 1}`);
    const isManualSubmission = stepIndex === 2 &&
      this.steps[2].name ===
        "Enter the token sent to your email to complete identity migration";
    return await this.verifyStep(stepIndex, isManualSubmission, callbacks);
  }

  /**
   * Continue anyway (skip verification)
   */
  async continueAnyway(
    stepIndex: number,
    callbacks: MigrationCallbacks = {},
  ): Promise<boolean> {
    console.log(`Continuing anyway for step ${stepIndex + 1}`);
    this.updateStepStatus(stepIndex, "completed", undefined, callbacks);
    this.showContinueAnyway[stepIndex] = false;
    callbacks.onShowContinueAnyway?.(stepIndex, false);

    // Continue with next step if not the last one
    if (stepIndex < 3) {
      return await this.continueToNextStep(stepIndex + 1, callbacks);
    }
    return true;
  }

  /**
   * Get current migration steps
   */
  getSteps(): MigrationStep[] {
    return [...this.steps];
  }

  /**
   * Get retry attempts for a step
   */
  getRetryAttempts(stepIndex: number): number {
    return this.retryAttempts[stepIndex] || 0;
  }

  /**
   * Check if should show continue anyway option
   */
  shouldShowContinueAnyway(stepIndex: number): boolean {
    return this.showContinueAnyway[stepIndex] || false;
  }

  // Private methods

  private async checkMigrationState(): Promise<MigrationState | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/migration-state`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error("Failed to check migration state:", error);
    }
    return null;
  }

  private validateParams(
    params: MigrationParams,
    callbacks: MigrationCallbacks,
  ): boolean {
    if (!params.service?.trim()) {
      this.updateStepStatus(0, "error", "Missing service URL", callbacks);
      return false;
    }
    if (!params.handle?.trim()) {
      this.updateStepStatus(0, "error", "Missing handle", callbacks);
      return false;
    }
    if (!params.email?.trim()) {
      this.updateStepStatus(0, "error", "Missing email", callbacks);
      return false;
    }
    if (!params.password?.trim()) {
      this.updateStepStatus(0, "error", "Missing password", callbacks);
      return false;
    }
    return true;
  }

  private updateStepStatus(
    index: number,
    status: MigrationStep["status"],
    error?: string,
    callbacks?: MigrationCallbacks,
    isVerificationError?: boolean,
  ) {
    console.log(
      `Updating step ${index} to ${status}${
        error ? ` with error: ${error}` : ""
      }`,
    );
    this.steps = this.steps.map((step, i) =>
      i === index
        ? { ...step, status, error, isVerificationError }
        : i > index
        ? {
          ...step,
          status: "pending",
          error: undefined,
          isVerificationError: undefined,
        }
        : step
    );
    callbacks?.onStepUpdate?.(index, this.steps[index]);
  }

  private async executeStep1CreateAccount(
    params: MigrationParams,
    callbacks: MigrationCallbacks,
  ): Promise<boolean> {
    this.updateStepStatus(0, "in-progress", undefined, callbacks);
    console.log("Starting account creation...");

    try {
      const response = await fetch(`${this.baseUrl}/api/migrate/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service: params.service,
          handle: params.handle,
          password: params.password,
          email: params.email,
          ...(params.invite ? { invite: params.invite } : {}),
        }),
      });

      console.log("Create account response status:", response.status);
      const responseText = await response.text();
      console.log("Create account response:", responseText);

      if (!response.ok) {
        try {
          const json = JSON.parse(responseText);
          throw new Error(json.message || "Failed to create account");
        } catch {
          throw new Error(responseText || "Failed to create account");
        }
      }

      try {
        const jsonData = JSON.parse(responseText);
        if (!jsonData.success) {
          throw new Error(jsonData.message || "Account creation failed");
        }
      } catch (e) {
        console.log("Response is not JSON or lacks success field:", e);
      }

      this.updateStepStatus(0, "verifying", undefined, callbacks);
      const verified = await this.verifyStep(0, false, callbacks);
      if (!verified) {
        console.log(
          "Account creation: Verification failed, waiting for user action",
        );
        return false;
      }

      return true;
    } catch (error) {
      this.updateStepStatus(
        0,
        "error",
        error instanceof Error ? error.message : String(error),
        callbacks,
      );
      return false;
    }
  }

  private async executeStep2DataMigration(
    callbacks: MigrationCallbacks,
  ): Promise<boolean> {
    this.updateStepStatus(1, "in-progress", undefined, callbacks);
    console.log("Starting data migration...");

    try {
      // Step 2.1: Migrate Repo
      console.log("Data migration: Starting repo migration");
      const repoRes = await fetch(`${this.baseUrl}/api/migrate/data/repo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!repoRes.ok) {
        const repoText = await repoRes.text();
        try {
          const json = JSON.parse(repoText);
          throw new Error(json.message || "Failed to migrate repo");
        } catch {
          throw new Error(repoText || "Failed to migrate repo");
        }
      }

      // Step 2.2: Migrate Blobs
      console.log("Data migration: Starting blob migration");
      const blobsRes = await fetch(`${this.baseUrl}/api/migrate/data/blobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!blobsRes.ok) {
        const blobsText = await blobsRes.text();
        try {
          const json = JSON.parse(blobsText);
          throw new Error(json.message || "Failed to migrate blobs");
        } catch {
          throw new Error(blobsText || "Failed to migrate blobs");
        }
      }

      // Step 2.3: Migrate Preferences
      console.log("Data migration: Starting preferences migration");
      const prefsRes = await fetch(`${this.baseUrl}/api/migrate/data/prefs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!prefsRes.ok) {
        const prefsText = await prefsRes.text();
        try {
          const json = JSON.parse(prefsText);
          throw new Error(json.message || "Failed to migrate preferences");
        } catch {
          throw new Error(prefsText || "Failed to migrate preferences");
        }
      }

      console.log("Data migration: Starting verification");
      this.updateStepStatus(1, "verifying", undefined, callbacks);
      const verified = await this.verifyStep(1, false, callbacks);
      if (!verified) {
        console.log(
          "Data migration: Verification failed, waiting for user action",
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error("Data migration: Error caught:", error);
      this.updateStepStatus(
        1,
        "error",
        error instanceof Error ? error.message : String(error),
        callbacks,
      );
      return false;
    }
  }

  private async executeStep3IdentityMigration(
    callbacks: MigrationCallbacks,
  ): Promise<boolean> {
    if (
      this.steps[2].status === "in-progress" ||
      this.steps[2].status === "completed"
    ) {
      console.log(
        "Identity migration already in progress or completed, skipping duplicate call",
      );
      return true;
    }

    this.updateStepStatus(2, "in-progress", undefined, callbacks);
    console.log("Requesting identity migration...");

    try {
      const response = await fetch(
        `${this.baseUrl}/api/migrate/identity/request`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );

      const responseText = await response.text();
      if (!response.ok) {
        try {
          const json = JSON.parse(responseText);
          throw new Error(
            json.message || "Failed to request identity migration",
          );
        } catch {
          throw new Error(
            responseText || "Failed to request identity migration",
          );
        }
      }

      try {
        const jsonData = JSON.parse(responseText);
        if (!jsonData.success) {
          throw new Error(
            jsonData.message || "Identity migration request failed",
          );
        }
        console.log("Identity migration requested successfully");

        // Update step name to prompt for token
        this.steps[2] = {
          ...this.steps[2],
          name:
            "Enter the token sent to your email to complete identity migration",
        };
        callbacks?.onStepUpdate?.(2, this.steps[2]);
        callbacks?.onIdentityTokenRequired?.();

        console.log(
          "Identity migration: Waiting for user token input, skipping auto-verification",
        );
        return true;
      } catch (e) {
        console.error("Failed to parse identity request response:", e);
        throw new Error(
          "Invalid response from server during identity request",
        );
      }
    } catch (error) {
      this.updateStepStatus(
        2,
        "error",
        error instanceof Error ? error.message : String(error),
        callbacks,
      );
      return false;
    }
  }

  private async executeStep4Finalization(
    callbacks: MigrationCallbacks,
  ): Promise<boolean> {
    this.updateStepStatus(3, "in-progress", undefined, callbacks);
    console.log("Starting finalization...");

    try {
      const response = await fetch(`${this.baseUrl}/api/migrate/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const responseText = await response.text();
      if (!response.ok) {
        try {
          const json = JSON.parse(responseText);
          throw new Error(json.message || "Failed to finalize migration");
        } catch {
          throw new Error(responseText || "Failed to finalize migration");
        }
      }

      try {
        const jsonData = JSON.parse(responseText);
        if (!jsonData.success) {
          throw new Error(jsonData.message || "Finalization failed");
        }
      } catch {
        throw new Error("Invalid response from server during finalization");
      }

      this.updateStepStatus(3, "verifying", undefined, callbacks);
      const verified = await this.verifyStep(3, false, callbacks);
      if (!verified) {
        console.log(
          "Finalization: Verification failed, waiting for user action",
        );
        return false;
      }

      callbacks?.onMigrationComplete?.();
      return true;
    } catch (error) {
      this.updateStepStatus(
        3,
        "error",
        error instanceof Error ? error.message : String(error),
        callbacks,
      );
      return false;
    }
  }

  private async verifyStep(
    stepNum: number,
    isManualSubmission: boolean = false,
    callbacks: MigrationCallbacks,
  ): Promise<boolean> {
    console.log(`Verification: Starting step ${stepNum + 1}`);

    // Skip automatic verification for step 2 (identity migration) unless it's after manual token submission
    if (stepNum === 2 && !isManualSubmission) {
      console.log(
        `Verification: Skipping automatic verification for identity migration step`,
      );
      return false;
    }

    this.updateStepStatus(stepNum, "verifying", undefined, callbacks);
    try {
      const response = await fetch(
        `${this.baseUrl}/api/migrate/status?step=${stepNum + 1}`,
      );
      const data = await response.json();

      if (data.ready) {
        console.log(`Verification: Step ${stepNum + 1} is ready`);
        this.updateStepStatus(stepNum, "completed", undefined, callbacks);
        // Reset retry state on success
        this.retryAttempts[stepNum] = 0;
        this.showContinueAnyway[stepNum] = false;
        callbacks?.onRetryUpdate?.(stepNum, 0);
        callbacks?.onShowContinueAnyway?.(stepNum, false);

        // Continue to next step if not the last one
        if (stepNum < 3) {
          setTimeout(
            () => this.continueToNextStep(stepNum + 1, callbacks),
            500,
          );
        }

        return true;
      } else {
        const statusDetails = {
          activated: data.activated,
          validDid: data.validDid,
          repoCommit: data.repoCommit,
          repoRev: data.repoRev,
          repoBlocks: data.repoBlocks,
          expectedRecords: data.expectedRecords,
          indexedRecords: data.indexedRecords,
          privateStateValues: data.privateStateValues,
          expectedBlobs: data.expectedBlobs,
          importedBlobs: data.importedBlobs,
        };
        const errorMessage = `${
          data.reason || "Verification failed"
        }\nStatus details: ${JSON.stringify(statusDetails, null, 2)}`;

        // Track retry attempts
        const currentAttempts = this.retryAttempts[stepNum] || 0;
        this.retryAttempts[stepNum] = currentAttempts + 1;
        callbacks?.onRetryUpdate?.(stepNum, currentAttempts + 1);

        // Show continue anyway option if this is the second failure
        if (currentAttempts >= 1) {
          this.showContinueAnyway[stepNum] = true;
          callbacks?.onShowContinueAnyway?.(stepNum, true);
        }

        this.updateStepStatus(stepNum, "error", errorMessage, callbacks, true);
        return false;
      }
    } catch (e) {
      const currentAttempts = this.retryAttempts[stepNum] || 0;
      this.retryAttempts[stepNum] = currentAttempts + 1;
      callbacks?.onRetryUpdate?.(stepNum, currentAttempts + 1);

      // Show continue anyway option if this is the second failure
      if (currentAttempts >= 1) {
        this.showContinueAnyway[stepNum] = true;
        callbacks?.onShowContinueAnyway?.(stepNum, true);
      }

      this.updateStepStatus(
        stepNum,
        "error",
        e instanceof Error ? e.message : String(e),
        callbacks,
        true,
      );
      return false;
    }
  }

  private async continueToNextStep(
    stepNum: number,
    callbacks: MigrationCallbacks,
  ): Promise<boolean> {
    switch (stepNum) {
      case 1:
        return await this.executeStep2DataMigration(callbacks);
      case 2:
        return await this.executeStep3IdentityMigration(callbacks);
      case 3:
        return await this.executeStep4Finalization(callbacks);
      default:
        return true;
    }
  }
}
