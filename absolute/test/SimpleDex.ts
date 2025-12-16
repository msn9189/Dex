import { expect } from "chai";
import { network } from "hardhat";
import { Contract, Wallet } from "ethers";

const { ethers } = await network.connect();

const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "function mint(address to, uint256 amount)",
];

const ERC20_BYTECODE =
  "0x608060405234801561001057600080fd5b50600436106100a95760003560e01c806370a082311161007157806370a082311461012357806395d89b411461014c578063a9059cbb14610154578063dd62ed3e14610167578063e5a6b10f1461017a57600080fd5b806306fdde03146100ae578063095ea7b3146100cc57806318160ddd146100ef57806323b872dd14610101578063313ce56714610114575b600080fd5b6100b661018d565b6040516100c391906102a8565b60405180910390f35b6100df6100da3660046102d9565b61021f565b60405190151581526020016100c3565b6002545b6040519081526020016100c3565b6100df61010f366004610303565b610239565b604051601281526020016100c3565b6100f361013136600461033f565b6001600160a01b031660009081526020819052604090205490565b6100b661025d565b6100df6101623660046102d9565b61026c565b6100f361017536600461035a565b61027a565b6100df6101883660046102d9565b6102a5565b60606003805461019c9061038d565b80601f01602080910402602001604051908101604052809291908181526020018280546101c89061038d565b80156102155780601f106101ea57610100808354040283529160200191610215565b820191906000526020600020905b8154815290600101906020018083116101f857829003601f168201915b5050505050905090565b60003361022d8185856102b3565b60019150505b92915050565b6000336102478582856102c5565b6102528585856102d3565b506001949350505050565b60606004805461019c9061038d565b60003361022d8185856102d3565b6001600160a01b03918216600090815260016020908152604080832093909416825291909152205490565b60003361022d8185856102d3565b6102c08383836000196102b3565b505050565b6102d1828484846000196102c5565b5050565b6102c08383836000196102d3565b600060208083528351808285015260005b8181101561030d578581018301518582016040015282016102f1565b8181111561031f576000604083870101525b50601f01601f1916929092016040019392505050565b60006020828403121561035157600080fd5b81356001600160a01b038116811461036857600080fd5b9392505050565b6000806040838503121561038257600080fd5b8235915060208301356001600160a01b03811681146103a057600080fd5b809150509250929050565b600181811c908216806103bf57607f821691505b6020821081036103df57634e487b7160e01b600052602260045260246000fd5b5091905056fea2646970667358221220d6c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c64736f6c63430008110033";

async function deployMockToken(name: string, initialSupply: bigint) {
    const factory = await ethers.getContractFactory("ERC20Mock");
    const [deployer] = await ethers.getSigners();

    const TokenFactory = await ethers.getContractFactory("MockERC20", {
        libraries: {},
    });

    const token = await ethers.deployContract("MockERC20", [name, Symbol, initialSupply]);

    await token.waitForDeployment();
    return token;
}
describe("SimpleDEX", function () {
    let dex: Contract;
    let token0: Contract;
    let owner: Wallet;
    let user1: Wallet;
    let user2: Wallet;

    beforeEach(async function () {
        const signers = await ethers.getSigners();
        owner = signers[0] as Wallet;
        user1 = signers[1] as Wallet;
        user2 = signers[2] as Wallet;

        const MockTokenFactory = await ethers.getContractFactory("MockERC20");

        dex = await ethers.deployContract("SimpleDex", [
            await token0.getAddress(),
            await token1.getAddress(),
        ]);
        await dex.waitForDeployment();

    });

    describe("Constructor", function() {
        it("Should set token0 and token1 correctly", async function() {
            expect(await dex.token0()).to.equal(await token0.getAddress());
            expect(await dex.token1()).to.equal(await token1.getAddress());
        });

        
    });
});
