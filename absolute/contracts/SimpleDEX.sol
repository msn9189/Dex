// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;


import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract  SimpleDEX {
  IERC20 public immutable token0;
  IERC20 public immutable token1;

  uint public reserve0;
  uint public reserve1;

  uint public constant FEE = 300;

  event LiquidityAdded(address indexed provider, uint amount0, uint amount1);
  event LiquidityRemoved(address indexed provider, uint amount0, uint amount1);
  event Swap(address indexed trader, uint amountIn, uint amountOut, bool isToken0);

  constructor(address _token0, address _token1) {
    token0 = IERC20(_token0);
    token1 = IERC20(_token1);
  }

  function addLiquidity(uint amount0, uint amount1) external {
    if (reserve0 == 0 && reserve1 == 0) {
      token0.transferFrom(msg.sender, address(this), amount0);
      token1.transferFrom(msg.sender, address(this), amount1);

      reserve0 += amount0;
      reserve1 += amount1;
      return;
    }

    uint amount1Optimal = (reserve1 * amount0) / reserve0;
    require(amount1Optimal <= amount1, "Excess token1");

    token0.transferFrom(msg.sender, address(this), amount0);
    token1.transferFrom(msg.sender, address(this), amount1Optimal);
    reserve0 += amount0;
    reserve1 += amount1Optimal;
    

    emit LiquidityAdded(msg.sender, amount0, amount1);
  }

  function removeLiquidity(uint amount0, uint amount1) external {
    require(amount0 > 0 || amount1 > 0, "Zero amount");
    require(amount0 <= reserve0, "Insufficient reserve0");
    require(amount1 <= reserve1, "Insufficient reserve1");

    uint oldK = reserve0 * reserve1;

    if(amount0 > 0){
      token0.transfer(msg.sender, amount0);
    }
    if(amount1 > 0) {
      token1.transfer(msg.sender, amount1);
    }

    reserve0 -= amount0;
    reserve1 -= amount1;

    uint newK = reserve0 * reserve1;

    require(newK >= oldK * 99 / 100, "Too much slippage");
    
    emit LiquidityRemoved(msg.sender, amount0, amount1);

    
  }  

  function swap(uint amountIn, bool isToken0) external returns (uint amountOut) {
    uint oldK = reserve0 * reserve1;
    
    uint amountInWithFee = (amountIn * (1000 - FEE)) / 10000;

    if(isToken0){
      amountOut = (reserve1 * amountInWithFee) / (reserve0 + amountInWithFee);

      token0.transferFrom(msg.sender, address(this), amountIn);
      token1.transfer(msg.sender, amountOut);

      reserve0 += amountIn;
      reserve1 -= amountOut;
    } else {
            amountOut = (reserve0 * amountInWithFee) / (reserve1 + amountInWithFee);

            token1.transferFrom(msg.sender, address(this), amountIn);
            token0.transfer(msg.sender, amountOut);
            
            reserve1 += amountIn;
            reserve0 -= amountOut;
    }

    uint newK = reserve0 * reserve1;

    require(newK >= oldK, "Invariant violated: K decreased");

    emit Swap(msg.sender, amountIn, amountOut, isToken0);
  }
}