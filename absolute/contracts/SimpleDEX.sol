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

  
}