import { useMemo } from "react";
import { Connection } from "@solana/web3.js";
import { AnchorWallet, useConnection, useWallet } from "@solana/wallet-adapter-react";
import { getProgram } from "@/utils/suisuinian";
import { Suisuinian } from "@/idl/suisuinian";

export const useProgram = () => {
  const { connection } = useConnection();
  const { wallet } = useWallet();

  const program = useMemo(() => {
    if (wallet && wallet.adapter) {
      // Cast wallet.adapter to AnchorWallet
      return getProgram(connection, wallet.adapter as AnchorWallet);
    }
    return null;
  }, [connection, wallet]);

  return program;
};
