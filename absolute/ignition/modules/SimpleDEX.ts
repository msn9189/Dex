import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("SimpleDEX", (m) => {
  const SimpleDEX = m.contract("SimpleDEX");

  return { SimpleDEX };
});
