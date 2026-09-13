import { createFileRoute } from "@tanstack/react-router";
import {
  chainId,
  crownContract,
  networkName,
  treasuryAddress,
  usdcAddress,
} from "@/lib/env";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () =>
        Response.json({
          network: networkName,
          chainId,
          contract: crownContract || null,
          usdc: usdcAddress,
          treasury: treasuryAddress || null,
        }),
    },
  },
});
