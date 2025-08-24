import consola from "consola";
import { TestEnvironment } from "../utils/test-env";
import { Agent, CredentialSession } from "@atproto/api";
import { TEST_CONFIG } from "../utils/config";
import { SMTPServer } from "smtp-server";

async function main() {
    const env = await TestEnvironment.create();

    const session = new CredentialSession(new URL(env.sourcePds.url));

    const result = await session.createAccount({
        handle: TEST_CONFIG.handle,
        password: TEST_CONFIG.password,
        email: TEST_CONFIG.email,
    });

    new Agent(session).com.atproto.identity.requestPlcOperationSignature();

    consola.success("Test environment created successfully");
    consola.info(`PLC running at ${env.plc.url}`);
    consola.info(`Source PDS running at ${env.sourcePds.url}`);
    consola.info(`Target PDS running at ${env.targetPds.url}`);
    consola.info(`Login as 👤 ${result.data.did} 🔑 ${TEST_CONFIG.password}`);
}

main();