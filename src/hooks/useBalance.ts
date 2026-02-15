import { alphaUsd, tempoModerato } from "@/constants";
import { useEffect, useRef, useState } from "react";
import { useWallets } from "@privy-io/react-auth";
import { tempoActions } from "tempo.ts/viem";
import {
  createWalletClient,
  custom,
  formatUnits,
  type Address,
} from "viem";

export function useBalance(address: string | undefined) {
  const [balance, setBalance] = useState<string>("0.00");
  const [loading, setLoading] = useState(true);
  const { wallets } = useWallets();
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!address) {
      setBalance("0.00");
      setLoading(false);
      return;
    }

    const wallet = wallets[0];
    if (!wallet) return;

    let cancelled = false;

    const fetchBalance = async () => {
      try {
        const provider = await wallet.getEthereumProvider();
        const client = createWalletClient({
          account: wallet.address as Address,
          chain: tempoModerato({ feeToken: alphaUsd }),
          transport: custom(provider),
        }).extend(tempoActions());

        const rawBalance = await client.token.getBalance({
          token: alphaUsd,
          account: address as Address,
        });

        const metadata = await client.token.getMetadata({ token: alphaUsd });

        if (cancelled) return;

        const formatted = formatUnits(rawBalance, metadata.decimals);
        const number = parseFloat(formatted);

        let displayBalance: string;
        if (number >= 1_000_000) {
          displayBalance = (number / 1_000_000).toFixed(2) + "M";
        } else if (number >= 1_000) {
          displayBalance = (number / 1_000).toFixed(2) + "K";
        } else {
          displayBalance = number.toFixed(2);
        }

        setBalance(displayBalance);
      } catch (error) {
        console.error("Error fetching balance:", error);
      } finally {
        if (!cancelled && !loadedRef.current) {
          setLoading(false);
          loadedRef.current = true;
        }
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [address, wallets]);

  return { balance, loading };
}
