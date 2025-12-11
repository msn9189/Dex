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
  
}