/**
 * Test environment utilities for setting up virtual PDS instances
 */

import { Agent } from "@atproto/api";
import { TestPds, TestPlc } from "@atproto/dev-env";
import { ComAtprotoServerCreateAccount } from "@atproto/api";
import { SMTPServer } from "smtp-server";

export interface TestPDSConfig {
  sourcePds: TestPds;
  targetPds: TestPds;
  plc: TestPlc;
}

const PLC_PORT = 2580;
const PDS_A_PORT = 2583;
const PDS_B_PORT = 2584;
const SMTP_PORT = 2525;

export type TestAccount = ComAtprotoServerCreateAccount.OutputSchema & {
  agent: Agent;
};

/**
 * Create a test environment with virtual PDS instances
 */
export class TestEnvironment {
  sourcePds: TestPds;
  targetPds: TestPds;
  plc: TestPlc;
  smtp: SMTPServer;

  constructor(sourcePds: TestPds, targetPds: TestPds, plc: TestPlc, smtp: SMTPServer) {
    this.sourcePds = sourcePds;
    this.targetPds = targetPds;
    this.plc = plc;
    this.smtp = smtp;
  }

  static async create(): Promise<TestEnvironment> {
    const plc = await TestPlc.create({
      port: PLC_PORT,
    });
    const pds = await this.setupMockPDS(plc.url);
    return new TestEnvironment(
      pds.sourcePds,
      pds.targetPds,
      plc,
      await this.createSMTPServer()
    );
  }

  private static async createSMTPServer(): Promise<SMTPServer> {
    const server = new SMTPServer({
      // disable STARTTLS to allow authentication in clear text mode
      disabledCommands: ['STARTTLS', 'AUTH'],
      logger: true,
      onData(stream, session, callback) {
        stream.pipe(process.stdout); // print message to console
        stream.on('end', callback);
      },
    });
    server.listen(SMTP_PORT, () => console.log(`SMTP server listening on port ${SMTP_PORT}`));
    return server;
  }

  private static async setupMockPDS(plcUrl: string) {
    const sourcePds = await TestPds.create({
      didPlcUrl: plcUrl,
      port: PDS_A_PORT,
      inviteRequired: false,
      devMode: true,
      emailSmtpUrl: `smtp://localhost:${SMTP_PORT}`,
      emailFromAddress: `noreply@localhost:${SMTP_PORT}`,
    });

    const targetPds = await TestPds.create({
      didPlcUrl: plcUrl,
      port: PDS_B_PORT,
      inviteRequired: false,
      acceptingImports: true,
      devMode: true,
      emailSmtpUrl: `smtp://localhost:${SMTP_PORT}`,
      emailFromAddress: `noreply@localhost:${SMTP_PORT}`,
    });

    return {
      sourcePds,
      targetPds,
    };
  }

  async cleanup() {
    try {
      await this.sourcePds.close();
      await this.targetPds.close();
      await this.plc.close();
      await new Promise<void>((resolve) => {
        this.smtp.close(resolve);
      });
    } catch (error) {
      console.error("Error during cleanup:", error);
    }
  }
}
