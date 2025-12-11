// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;


import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract  SimpleDEX {
  IERC20 public immutable token0;
  IERC20 public immutable token1;

  uint public reserve0;
  uint public reserve1;

  uint public constant K = 0;
  uint public constant FEE = 300;

  event LiquidityAdded(address indexed provider, uint amount0, uint amount1);
  event LiquidityRemoved(address indexed provider, uint amount0, uint amount1);
  event Swap(address indexed trader, uint amountIn, uint amountOut, bool isToken0);

  constructor(address _token0, address _token1) {
    token0 = IERC20(_token0);
    token1 = IERC20(_token1);
  }

  function addLiquidity(uint amount0Desired, uint amount1Desired) external returns (uint amount0, uint amount1) {
    if (K > 0) {
      uint amount1Optimal = (reserve1 * amount0Desired) / reserve0;
      require(amount1Optimal <= amount1Desired, "Excess token1");
      amount1 = amount1Optimal;
    } else {
      amount0 = amount0Desired;
      amount1 = amount1Desired;
    }

    token0.transferFrom(msg.sender, address.(this), amount0);
    token1.transferFrom(msg.sender, address.(this), amount1);

    reserve0 += amount0;
    reserve1 += amount1;

    K = reserve0 * reserve1;

    emit LiquidityAdded(msg.sender, amount0, amount1);
  }
}