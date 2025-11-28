import { useMemo } from "react";
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { getProgram } from "@/utils/suisuinian";

export const useProgram = () => {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const program = useMemo(() => {
    if (wallet) {
      return getProgram(connection, wallet);
    }
    return null;
  }, [connection, wallet]);

  return program;
};
