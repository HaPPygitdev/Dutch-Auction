const { expect } = require("chai")
const { ethers } = require("hardhat")

describe("AucEngine", function() {
    let owner
    let seller
    let buyer
    let auct

    beforeEach(async function(){
        [owner, seller, buyer] = await ethers.getSigners()

        const AucEngine = await ethers.getContractFactory("AucEngine", owner)
        auct = await AucEngine.deploy()
        await auct.deployed()
    })
    it("sets owner", async function(){
        const currentOwner = await auct.owner()
        console.log(currentOwner)
        expect(currentOwner).to.eq(owner.address)
    })

    async function getTimeStamp(bn) {
        return(
            await ethers.provider.getBlock(bn)
        ).timestamp
    }

    describe("createAuction", function() {
        it("creates auction correctly", async function(){
            const duration = 60
            const tx = await auct.createAuction(
                ethers.utils.parseEther("0.0001"), // parseEther - конвертирует кол-во эфира в единицы вей
                3, // 3 wei
                "fake item",
                duration // 60 seconds
            )

            const cAuction = await auct.auctions(0)
            expect(cAuction.item).to.eq("fake item")
            expect(cAuction.startingPrice).to.eq(ethers.utils.parseEther("0.0001"))
            expect(cAuction.discountRate).to.eq(3)
            console.log(tx)
            const ts = await getTimeStamp(tx.blockNumber)
            expect(cAuction.endAt).to.eq(ts + duration)
            //expect(cAuction.endAt-cAuction.startAt).to.eq(duration)
        })
    })

    function delay(ms){
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    describe("buy", function() {
        it("allows to buy", async function(){
            await auct.connect(seller).createAuction(
                ethers.utils.parseEther("0.0001"), // parseEther - конвертирует кол-во эфира в единицы вей
                3, // 3 wei
                "fake item",
                60 // 60 seconds
            )

            this.timeout(5000) // 1 sec = 1000. this - этот тетс. .timeout - может работать до 5 секунд
            await delay(1000)

            const buyTx = await auct.connect(buyer).
                buy(0, {value: ethers.utils.parseEther("0.0001")})

            const cAuction = await auct.auctions(0)
            const finalPrice = cAuction.finalPrice
            await expect(() => buyTx).
                to.changeEtherBalance(
                    seller, finalPrice - Math.floor((finalPrice * 10) / 100)
                )
            
            await expect(buyTx)
                .to.emit(auct, 'AuctionEnded')
                .withArgs(0, finalPrice, buyer.address);
            
            await expect(
                auct.connect(buyer).
                buy(0, {value: ethers.utils.parseEther("0.0001")})    
            ).to.be.revertedWith('stopped!')
        })
    })
})