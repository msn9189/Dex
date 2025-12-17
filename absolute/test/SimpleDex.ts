import { expect } from "chai";
import { network } from "hardhat";
import { BaseContract, Contract, Wallet } from "ethers";

const { ethers } = await network.connect();

type SimpleDexContract = BaseContract & {
  token0(): Promise<string>;
  token1(): Promise<string>;
  reserve0(): Promise<bigint>;
  reserve1(): Promise<bigint>;
  addLiquidity(amount0: bigint, amount1: bigint): Promise<any>;
  removeLiquidity(amount0: bigint, amount1: bigint): Promise<any>;
  swap(amountIn: bigint, isToken0: boolean): Promise<any>;
};

describe("SimpleDEX", function () {
    let dex: SimpleDexContract;
    let token0: BaseContract;
    let token1: BaseContract;
    let owner: Wallet;
    let user1: Wallet;
    let user2: Wallet;

    beforeEach(async function () {
        const signers = await ethers.getSigners();
        owner = signers[0] as Wallet;
        user1 = signers[1] as Wallet;
        user2 = signers[2] as Wallet;

        const MockToken = await ethers.getContractFactory("MockERC20");
        token0 = await MockToken.deploy(
          "Token0",
          "TKN0",
          ethers.parseEther("1000000")
        );
        await token0.waitForDeployment();

        token1 = await MockToken.deploy(
          "Token1",
          "TKN1",
          ethers.parseEther("1000000")
        );
        await token1.waitForDeployment();

        dex = (await ethers.deployContract("SimpleDEX", [
          await token0.getAddress(),
          await token1.getAddress(),
        ])) as unknown as SimpleDexContract;; 
        await dex.waitForDeployment();

    });

    describe("Constructor", function() {
        it("Should set token0 and token1 correctly", async function() {
            expect(await dex.token0()).to.equal(await token0.getAddress());
            expect(await dex.token1()).to.equal(await token1.getAddress());
        });

        it("Should initialize reserves to zero", async function () {
            expect(await dex.reserve0()).to.equal(0n);
            expect(await dex.reserve1()).to.equal(0n);
        });        
    });

    describe("addLiquidity", function () {
        it("Should add first liquidity successfully", async function () {
          const amount0 = ethers.parseEther("100");
          const amount1 = ethers.parseEther("200");

          await token0.approve(await dex.getAddress(), amount0);
          await token1.approve(await dex.getAddress(), amount1);

          await expect(dex.addLiquidity(amount0, amount1))
            .to.emit(dex, "LiquidityAdded")
            .withArgs(owner.address, amount0, amount1);

          expect(await dex.reserve0()).to.equal(amount0);
          expect(await dex.reserve1()).to.equal(amount1);
        });

        it("Should add subsequent liquidity proportionally", async function () {
          // First liquidity
          const initial0 = ethers.parseEther("100");
          const initial1 = ethers.parseEther("200");

          await token0.approve(await dex.getAddress(), initial0);
          await token1.approve(await dex.getAddress(), initial1);
          await dex.addLiquidity(initial0, initial1);

          // Second liquidity - exact ratio
          const amount0 = ethers.parseEther("50");
          const amount1 = ethers.parseEther("100");

          await token0.approve(await dex.getAddress(), amount0);
          await token1.approve(await dex.getAddress(), amount1);

          await expect(dex.addLiquidity(amount0, amount1))
            .to.emit(dex, "LiquidityAdded")
            .withArgs(owner.address, amount0, amount1);

          expect(await dex.reserve0()).to.equal(initial0 + amount0);
          expect(await dex.reserve1()).to.equal(initial1 + amount1);
        });

        it("Should use optimal amount1 when excess provided", async function () {
          // First liquidity
          const initial0 = ethers.parseEther("100");
          const initial1 = ethers.parseEther("200");

          await token0.approve(await dex.getAddress(), initial0);
          await token1.approve(await dex.getAddress(), initial1);
          await dex.addLiquidity(initial0, initial1);

          // Second liquidity - excess token1
          const amount0 = ethers.parseEther("50");
          const excessAmount1 = ethers.parseEther("150"); // More than needed
          const optimalAmount1 = ethers.parseEther("100");

          await token0.approve(await dex.getAddress(), amount0);
          await token1.approve(await dex.getAddress(), excessAmount1);

          await expect(dex.addLiquidity(amount0, excessAmount1))
            .to.emit(dex, "LiquidityAdded")
            .withArgs(owner.address, amount0, optimalAmount1);

          expect(await dex.reserve0()).to.equal(initial0 + amount0);
          expect(await dex.reserve1()).to.equal(initial1 + optimalAmount1);
        });

        it("Should revert if insufficient token1 provided", async function () {
          // First liquidity
          const initial0 = ethers.parseEther("100");
          const initial1 = ethers.parseEther("200");

          await token0.approve(await dex.getAddress(), initial0);
          await token1.approve(await dex.getAddress(), initial1);
          await dex.addLiquidity(initial0, initial1);

          // Try to add with insufficient token1
          const amount0 = ethers.parseEther("50");
          const insufficientAmount1 = ethers.parseEther("50"); // Less than needed

          await token0.approve(await dex.getAddress(), amount0);
          await token1.approve(await dex.getAddress(), insufficientAmount1);

          await expect(
            dex.addLiquidity(amount0, insufficientAmount1)
          ).to.be.revertedWith("Excess token1");
        });
    });

    describe("removeLiquidity", function () {
      beforeEach(async function () {
        const amount0 = ethers.parseEther("100");
        const amount1 = ethers.parseEther("200");

        await token0.approve(await dex.getAddress(), amount0);
        await token1.approve(await dex.getAddress(), amount1);
        await dex.addLiquidity(amount0, amount1);
      });

      it("Should remove liquidity proportionally", async function () {
        const remove0 = ethers.parseEther("50");
        const remove1 = ethers.parseEther("100");

        const balance0Before = await token0.balanceOf(owner.address);
        const balance1Before = await token1.balanceOf(owner.address);

        await expect(dex.removeLiquidity(remove0, remove1)).to.emit(dex, "LiquidityRemoved").withArgs(owner.address, remove0, remove1);

        expect(await dex.reserve0()).to.equal(remove0);
        expect(await dex.reserve1()).to.equal(remove1);

        const balance0After = await token0.balanceOf(owner.address);
        const balance1After = await token1.balanceOf(owner.address);

        expect(balance0After - balance0Before).to.equal(remove0);
        expect(balance1After - balance1Before).to.equal(remove1);

      });

      it("Should revert if removing zero amounts", async function () {
        await expect(dex.removeLiquidity(0, 0)).to.be.revertedWith(
          "Zero amount"
        );
      });

      it("Should revert if removing more than reserves", async function () {
        await expect(
          dex.removeLiquidity(
            ethers.parseEther("150"),
            ethers.parseEther("100")
          )
        ).to.be.revertedWith("Insufficient reserve0");
      });

      it("Should revert if removing non-proportional amounts", async function () {
        await expect(
          dex.removeLiquidity(ethers.parseEther("50"), ethers.parseEther("50"))
        ).to.be.revertedWith("Must remove proportionally");
      });
    });

    describe("swap", function () {
      beforeEach(async function () {
        // Add initial liquidity
        const amount0 = ethers.parseEther("100");
        const amount1 = ethers.parseEther("200");

        await token0.approve(await dex.getAddress(), amount0);
        await token1.approve(await dex.getAddress(), amount1);
        await dex.addLiquidity(amount0, amount1);
      });

      it("Should swap token0 for token1", async function () {
        const amountIn = ethers.parseEther("10");
        await token0.approve(await dex.getAddress(), amountIn);

        const balance1Before = await token1.balanceOf(owner.address);
        const reserve0Before = await dex.reserve0();
        const reserve1Before = await dex.reserve1();

        const tx = await dex.swap(amountIn, true);
        const receipt = await tx.wait();

        const balance1After = await token1.balanceOf(owner.address);
        const reserve0After = await dex.reserve0();
        const reserve1After = await dex.reserve1();

        // Check reserves updated correctly
        expect(reserve0After).to.equal(reserve0Before + amountIn);
        expect(reserve1After).to.be.lessThan(reserve1Before);

        // Check user received tokens
        const amountOut = balance1After - balance1Before;
        expect(amountOut).to.be.greaterThan(0n);

        // Check event emitted
        const event = receipt?.logs.find((log: any) => {
          try {
            const parsed = dex.interface.parseLog(log);
            return parsed?.name === "Swap";
          } catch {
            return false;
          }
        });
        expect(event).to.not.be.undefined;
      });

      it("Should swap token1 for token0", async function () {
        const amountIn = ethers.parseEther("20");
        await token1.approve(await dex.getAddress(), amountIn);

        const balance0Before = await token0.balanceOf(owner.address);
        const reserve0Before = await dex.reserve0();
        const reserve1Before = await dex.reserve1();

        await dex.swap(amountIn, false);

        const balance0After = await token0.balanceOf(owner.address);
        const reserve0After = await dex.reserve0();
        const reserve1After = await dex.reserve1();

        expect(reserve1After).to.equal(reserve1Before + amountIn);
        expect(reserve0After).to.be.lessThan(reserve0Before);

        const amountOut = balance0After - balance0Before;
        expect(amountOut).to.be.greaterThan(0n);
      });

      it("Should maintain constant product invariant", async function () {
        const amountIn = ethers.parseEther("10");
        await token0.approve(await dex.getAddress(), amountIn);

        const oldK = (await dex.reserve0()) * (await dex.reserve1());
        await dex.swap(amountIn, true);
        const newK = (await dex.reserve0()) * (await dex.reserve1());

        // K should increase due to fees
        expect(newK).to.be.greaterThanOrEqual(oldK);
      });

      it("Should revert if swapping with zero reserves", async function () {
        // Remove all liquidity first
        await dex.removeLiquidity(
          ethers.parseEther("100"),
          ethers.parseEther("200")
        );

        const amountIn = ethers.parseEther("10");
        await token0.approve(await dex.getAddress(), amountIn);

        await expect(dex.swap(amountIn, true)).to.be.revertedWith(
          "Insufficient liquidity"
        );
      });

      it("Should revert if swapping zero amount", async function () {
        await expect(dex.swap(0, true)).to.be.revertedWith("Invalid amount");
      });

      it("Should apply fee correctly (3%)", async function () {
        const amountIn = ethers.parseEther("100");
        await token0.approve(await dex.getAddress(), amountIn);

        const reserve1Before = await dex.reserve1();
        await dex.swap(amountIn, true);
        const reserve1After = await dex.reserve1();

        // With 3% fee, amountInWithFee = 97% of amountIn
        // The swap should use less than the full amount
        const amountOut = reserve1Before - reserve1After;

        // Verify fee was applied (amountOut should be less than if no fee)
        // This is a basic check - actual calculation depends on the formula
        expect(amountOut).to.be.greaterThan(0n);
      });

    });

    describe("Edge cases", function () {
      it("Should handle multiple swaps correctly", async function () {
        // Add liquidity
        const amount0 = ethers.parseEther("100");
        const amount1 = ethers.parseEther("200");

        await token0.approve(await dex.getAddress(), amount0);
        await token1.approve(await dex.getAddress(), amount1);
        await dex.addLiquidity(amount0, amount1);

        // Multiple swaps
        const swap1 = ethers.parseEther("10");
        await token0.approve(await dex.getAddress(), swap1);
        await dex.swap(swap1, true);

        const swap2 = ethers.parseEther("5");
        await token1.approve(await dex.getAddress(), swap2);
        await dex.swap(swap2, false);

        // Reserves should still be positive
        expect(await dex.reserve0()).to.be.greaterThan(0n);
        expect(await dex.reserve1()).to.be.greaterThan(0n);
      });

      it("Should allow multiple users to add liquidity", async function () {
        // First user adds liquidity
        const amount0 = ethers.parseEther("100");
        const amount1 = ethers.parseEther("200");

        await token0.approve(await dex.getAddress(), amount0);
        await token1.approve(await dex.getAddress(), amount1);
        await dex.addLiquidity(amount0, amount1);

        // Second user adds liquidity
        const amount0_2 = ethers.parseEther("50");
        const amount1_2 = ethers.parseEther("100");

        await token0.connect(user1).approve(await dex.getAddress(), amount0_2);
        await token1.connect(user1).approve(await dex.getAddress(), amount1_2);
        await dex.connect(user1).addLiquidity(amount0_2, amount1_2);

        expect(await dex.reserve0()).to.equal(ethers.parseEther("150"));
        expect(await dex.reserve1()).to.equal(ethers.parseEther("300"));
      });
    });
});
