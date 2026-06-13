import { createClient, createAccount } from "genlayer-js";
import { simulator } from "genlayer-js/chains";
const account = createAccount();
export const client = createClient({ chain: simulator, account });
export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";
