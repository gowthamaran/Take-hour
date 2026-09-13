import { createConfig, http, fallback } from "wagmi";
import { coinbaseWallet, injected, walletConnect } from "wagmi/connectors";
import { arcChain } from "./chain";
import { rpcUrl, walletConnectProjectId } from "./env";

const connectors = [
  injected({ shimDisconnect: true }),
  coinbaseWallet({
    appName: "HOUR",
    preference: "eoaOnly",
  }),
  ...(walletConnectProjectId
    ? [
        walletConnect({
          projectId: walletConnectProjectId,
          showQrModal: true,
          metadata: {
            name: "HOUR",
            description: "Every UTC hour has one crown.",
            url: "https://takehour.lol",
            icons: ["https://takehour.lol/favicon.svg"],
          },
        }),
      ]
    : []),
];

export const wagmiConfig = createConfig({
  chains: [arcChain],
  connectors,
  transports: {
    [arcChain.id]: fallback([
      http(rpcUrl),
      http("https://rpc.testnet.arc.network"),
    ]),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
