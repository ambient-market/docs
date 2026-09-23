import { baseURL, registerAgent } from "./lib/ambient.mjs";

const agent = await registerAgent();

console.log(`Ambient API: ${baseURL}`);
console.log(`Principal: ${agent.principalId}`);
console.log(`Actor: ${agent.actorId}`);
console.log(`Key: ${agent.keyId}`);
console.log(`Access token: ${agent.accessToken}`);

