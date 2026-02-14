import type { Address } from "viem";
import { Chain } from "tempo.ts/viem";

export const alphaUsd =
  "0x20c0000000000000000000000000000000000001" as Address;

// Tempo Moderato testnet (chain ID 42431)
// The SDK's default `tempo` export points to the old testnet (42429).
// Moderato is the active hackathon testnet.
export const tempoModerato = Chain.define({
  id: 42431,
  name: "Tempo Moderato",
  nativeCurrency: { name: "USD", symbol: "USD", decimals: 6 },
  rpcUrls: {
    default: {
      http: ["https://rpc.moderato.tempo.xyz"],
      webSocket: ["wss://rpc.moderato.tempo.xyz"],
    },
  },
  blockExplorers: {
    default: {
      name: "Tempo Explorer",
      url: "https://explore.moderato.tempo.xyz",
    },
  },
});
