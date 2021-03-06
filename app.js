//REQUIRE MODULES
var express =require("express");
var app = express();
var bodyParser= require("body-parser");
var multer = require("multer");
var port= process.env.PORT || 1000;
var hbs = require("hbs")
var path = require("path");
var fs = require("fs");
var { google }= require("googleapis");
const cors = require('cors');
require("dotenv").config();
var credentials= require("./credentials.json")
//DB THINGS 
require("./db/db");
var product = require("./public/models/product.js");
var user = require("./public/models/user.js");
var cartDB= require("./public/models/cart.js");
var orderDB= require("./public/models/order.js")
var orderUnregisterDB= require("./public/models/orderUnregister.js")
var processDB=require("./public/models/process.js")
var delieveredDB=require("./public/models/delievered.js");
var main= require("./public/models/main.js");
var feed= require("./public/models/feed.js");
//LOCAL VARIABLES
var public_path= path.join(__dirname,"/public/views")
var partials_path= path.join(__dirname,"/public/partial")
var views_path= path.join(__dirname,"/public/views")
//SET MIDDLEWARE
app.use(cors());
app.use(express.static(path.join(__dirname,"public")));
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json());
app.use(express.urlencoded({extended: false}))
app.use(express.json());
hbs.registerPartials(partials_path)
app.set("view engine", "hbs")
app.set("views", views_path)
//HELPER FUNCTIONS
hbs.registerHelper("index_plus", function(val){
    return(val+1)
})
hbs.registerHelper("total", function(price, quantity){
    return(price*quantity)
})
//MIDDLEWARES
var Storage = multer.diskStorage({
    destination: function(req, file, cb){
        cb(null, "./public/upload")
    },
    filename: function(req, file, cb){
        cb(null, file.originalname)
    }
})
var upload_pics= multer({
    storage: Storage
}).array("file", 12);

var upload_poster= multer({
    storage: Storage
}).array("file_upload", 7);

    //UPLOAD PIC 
var CLIENT_ID= process.env.CLIENT_ID;
var CLIENT_SECRET= process.env.CLIENT_SECRET;
var REDIRECT_URI= process.env.REDIRECT_URI;
var REFRESH_TOKEN= process.env.REFRESH_TOKEN;


var oauth2client= new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
)
oauth2client.setCredentials({
    refresh_token: REFRESH_TOKEN
})
var drive = google.drive({
    version: "v3",
    auth: oauth2client
})

//ROUTES
app.get("/", (req, res)=>{
    var find= async function(){
        try{
            var findData= await product.find({}).sort({date: -1});
            res.render("index", {data: findData});
        }
        catch{
            (e)=>{console.log(e)}
        }
    };
    find();
})
app.get("/view/:id", (req, res)=>{
    var findView= async function(){
        try{
            let id= req.params.id;
            var findData= await product.findOne({_id: id}).sort({date: -1});
            console.log(findData)
            res.render("view", {data: findData});
        }
        catch{
            (e)=>{console.log(e)}
        }
    };
    findView();
})
app.get("/upload", (req, res)=>{
    var findMainData= async function(){
        try{
        let find = await main.findOne({});
        res.render("upload", {
            cate: find.cate,
            brand: find.brand
        });
        }
        catch{
            (e)=>{console.log(e)}
        }
    };
    findMainData();
})

app.post("/upload", (req, res)=>{
    var {title, price, cut_price, sell_price, visiblity,discount,  sell, brand, brand_name, category, type ,colors, sizes,search_keyword,keywords, table ,des, note }= req.body;
    console.log(req.body);
    async function upload(){
        try{
            console.log("REACHED");
            let t= title.toLowerCase();
            let d= des.toLowerCase();
            let n= note.toLowerCase();
            let b= brand_name.toLowerCase();
            let s = search_keyword.toLowerCase();
            let col= colors.toLowerCase();
            let siz= sizes.toLowerCase();
            let k= keywords.toLowerCase();
            var upload = new product ({
                title: t,
                price: price,
                cut_price: cut_price,
                sell_price: sell_price,
                visiblity: visiblity,
                discount: discount,
                sell: sell,
                brand: brand,
                brand_name: b,
                category: category,
                type: type,
                colors: col,
                sizes: siz,
                search_keyword: s,
                keywords: k,
                table: tab,
                des: d,
                note: n,
            })
            var data = await upload.save();
            res.render("upload_pics", {id: data._id})
        }
        catch{
            (e)=>{console.log(e)}
        }
    };
    upload();
});

app.post("/upload_pics/:id",upload_pics,  (req, res)=>{
    var upload =  async function(arr){       
        try{
            var pics= req.files;
            for (var i=0; i<pics.length; i++){
                try{
                var uploadAndView= async function(){
                    try{
                        //UPLOADING TO GOOGLE DRIVE
                    var filePath= path.join(__dirname,pics[i].path);
                    console.log(filePath)
                    var response = await drive.files.create({
                        requestBody:{
                            name: pics[i].originalname,
                            mimeType: pics[i].mimeType
                        },
                        media: {
                            mimeType: pics[i].mimeType,
                            body: fs.createReadStream(filePath)
                        }
                    });
                    var response_data= response.data;
                    console.log(response)
                    var fileId= response_data.id;
                    //GENERATING VIEW LINK INTO GOOGLE DRIVE
                    await drive.permissions.create({
                        fileId: fileId,
                        requestBody:{
                            role: "reader",
                            type: "anyone"
                        }
                    })
    
                    var result= await drive.files.get({
                        fileId: fileId,
                        fields: "webViewLink, webContentLink"
                    })
                    var obj={
                        id: fileId,
                        link: result.data.webViewLink
                    };
                    var detail= arr=arr.concat(obj);
                    //DELETING UPLOADED FILE FROM SERVER NOT FROM GOOGLE DRIVE
                    fs.unlink(filePath,()=>{console.log("file deleted")})
                    console.log(`I: ${i}, pics: ${pics.length}`)
                    if(detail.length==pics.length){
                        //SENDING TO CHANGE URL TO VIEW URL
                        res.render("link", {data: detail, id: req.params.id});
                        res.status(201).header(201).setHeader(201);
                    }   
                        
                    }
                    catch{
                        (e)=>{console.log(e)}
                    }
                };
                        uploadAndView();
                 }
                 catch(e){
                     console.log(e)
                    }
            }
        }
        catch{
            (e)=>{
                console.log(e)
            }
        }
    };
    upload([]);
 
})

app.post("/link/:id", (req,res)=>{
    var reqData=req.body
    console.log(req.body)
    var valueInArray= Object.values(reqData)
    console.log(valueInArray);
    var save= async function(){
        try{    
                var data= valueInArray.map((val)=>{
                    console.log(val)
                    return({id:val[0], link:val[1]})
                })
                    console.log(data)
                    var main_img= data[0]
                    console.log(main_img);
                    var findData= await product.findByIdAndUpdate({_id: req.params.id}, {$set: {images: data, main_img:main_img}}, {
                        new: true, useFindAndModify: false
                    })
                    res.render("productPrint", {
                        data: findData
                    })
        }
        catch{
            (e)=>{console.log(e)}
        }
    };
    save();
});
app.get("/poster", (req, res)=>{
    res.render("poster");
});

app.post("/poster", upload_poster ,(req, res)=>{
    var upload_poster =  async function(arr){       
        try{
            var pics= req.files;
        console.log(pics)
        for (let j=0; j<pics.length; j++){
            try{
            var uploadAndViewPoster= async function(){
                try{
                    //UPLOADING TO GOOGLE DRIVE
                var filePath= path.join(__dirname,pics[j].path);
                var response = await drive.files.create({
                    requestBody:{
                        name: pics[j].originalname,
                        mimeType: pics[j].mimeType
                    },
                    media: {
                        mimeType: pics[j].mimeType,
                        body: fs.createReadStream(filePath)
                    }
                })
                var response_data= response.data
                var fileId= response_data.id;
                console.log(response_data)
                console.log(response_data+ " " + fileId);
                //GENERATING VIEW LINK INTO GOOGLE DRIVE
                await drive.permissions.create({
                    fileId: fileId,
                    requestBody:{
                        role: "reader",
                        type: "anyone"
                    }
                })

                var result= await drive.files.get({
                    fileId: fileId,
                    fields: "webViewLink, webContentLink"
                })
                var obj={
                    id: fileId,
                    link: result.data.webViewLink
                };
                console.log(obj)
                var detail= arr=arr.concat(obj);
                //DELETING UPLOADED FILE FROM SERVER NOT FROM GOOGLE DRIVE
                fs.unlink(filePath,()=>{console.log("file deleted")})
                console.log(`I: ${j}, pics: ${pics.length}`)
                if(detail.length==pics.length){
                    //SENDING TO CHANGE URL TO VIEW URL
                    res.render("posterLink", {data: detail});
                    res.status(201).header(201).setHeader(201);
                }   
                    
                }
                catch{
                    (e)=>{console.log(e)}
                }
            };
                    uploadAndViewPoster();
             }
             catch(e){
                 console.log(e)
                }
        }
        }
        catch{
            (e)=>{console.log(e)}
        }
    };
    upload_poster([]);
});
app.post("/posterLink/", (req,res)=>{
    var reqData=req.body
    var valueInArray= Object.values(reqData)
    console.log(valueInArray);
    var savePoster= async function(){
        try{    
                var data= valueInArray.map((val)=>{
                    console.log(val)
                    return({id:val[0], link:val[1]})
                })
                    console.log(data)
                    var findData= await main.findOneAndUpdate({},{$set: {poster: data}}, {
                        new: true, useFindAndModify: false
                    })
                    console.log(findData)
                    res.redirect("/");
        }
        catch{
            (e)=>{console.log(e)}
        }
    };
    savePoster();
});
app.get("/more", (req, res)=>{
    var findMain= async function(){
        try{
            let find = await main.findOne();
             res.render("more", { data: find})
        }
        catch{
            (e)=>{console.log(e)}
        }
    };
    findMain();
});
app.post("/more", (req, res)=>{
    var editAll= async function(){
        try{
            let {discount, sell, cate, brand}= req.body;
            var findMain= await main.findOneAndUpdate({},{$set: {discount: discount, sell: sell, cate: cate, brand: brand}},{
                new: true, useFindAndModify: false
            });
            await product.updateMany({}, {discount: discount, sell: sell})
            console.log(findMain)
            res.redirect("/");           
        }catch{
            (e)=>{console.log(e)}
        }
    };editAll();
})

app.get("/edit/:id",(req, res)=>{
    let id=req.params.id;
    var find= async function(){
        try{
             var data= await product.findOne({_id: id});
            var dataObj={
              id: id,
              title: data.title,
              keywords: data.keywords,
              table: data.table,
              des: data.des,
              note: data.note,
              price: data.price,
              cut_price:data.cut_price,         
              sell_price: data.sell_price,
              brand_name: data.brand_name,
              category: data.category,
              type: data.type,
              sell: data.sell,
              colors: data.colors,
              sizes: data.sizes,
              visiblity: data.visiblity,
              brand:data.brand,
              search_keyword: data.search_keyword,
              discount:data.discount,
            }
            console.log(dataObj)
             res.render("edit", {dataObj})
        }
        catch{
            (e)=>{
                console.log(e.message+ "  " + e)
            }
        }
    };
    find();
})

app.post("/edit/:id", (req, res)=>{
        var findAndUpdata= async function(){
        try{
            let data= req.body;
            let t= data.title.toLowerCase();
            let b= data.brand_name.toLowerCase();
            let d= data.des.toLowerCase();
            let n=data.note.toLowerCase();
            let s=data.search_keyword.toLowerCase();
            let k=data.keywords.toLowerCase();
            let colors= data.colors.toLowerCase();
            let sizes= data.sizes.toLowerCase();
            var data_obj= {
            title: t,
            price: data.price,
            cut_price: data.cut_price,
            sell_price: data.sell_price,
            visiblity: data.visiblity,
            discount: data.discount,
            sell: data.sell,
            brand: data.brand,
            brand_name: b,
            category: data.category,
            type: data.type,
            sizes: sizes,
            colors: colors,
            keywords: k,
            search_keyword: s,
            table: data.table,
            des: d,
            note: n
          }
          console.log(data_obj);
          var newData= await product.findByIdAndUpdate({_id: req.params.id}, {$set:{
            title: data_obj.title,
            price: data_obj.price,
            cut_price: data_obj.cut_price,
            sell_price: data_obj.sell_price,
            visiblity: data_obj.visiblity,
            discount: data_obj.discount,
            sell: data_obj.sell,
            brand: data_obj.brand,
            brand_name: data_obj.brand_name,
            category: data_obj.category,
            type: data_obj.type,
            sizes: data_obj.sizes,
            colors: data_obj.colors,
            keywords: data_obj.keywords,
            search_keyword: data_obj.search_keyword,
            table: data_obj.table,
            des: data_obj.des,
            note: data_obj.note
          }},{new: true, useFindAndModify: false})
          res.redirect("/");
    }catch{
        (e)=>{console.log(e)}
    }
    };
    findAndUpdata();
})

app.post("/delete/:id", (req, res)=>{
    var findAndDelete= async function(){
        try{
        var dataFind= await product.findOne({_id: req.params.id})
        var images=dataFind.images;

            if(images.length>0){
                var imgArr=images.map((val, ind)=>{
                    return(val.id)
                })
                    imgArr.map((val, ind)=>{
                        console.log(val);
                        var deleteData= async function(){
                            try{
                                console.log("Reached")
                                var deleteImg= drive.files.delete({
                                    fileId: val
                                });
                                console.log( deleteImg.data + "  " + deleteImg.status);
                                if(ind+1 == imgArr.length){
                                    var findDelData= await product.findOneAndRemove({_id: req.params.id}, {new: true});
                                    console.log(findDelData);
                                    res.redirect("/");
                                }
                            }catch{
                                (e)=>{console.log(e)}
                            }
                        };
                        deleteData();
                    })
            }
            else if(images.length<=0){
                console.log("REACHED");
                var dataDeleteWithoutPic = async function(){
                    try{
                    var findDelData= await product.findOneAndRemove({_id: req.params.id}, {new: true});
                    res.redirect("/");
                    }
                    catch{
                        (e)=>{console.log(e)}
                    }
                };
                dataDeleteWithoutPic();
            }
        }
        catch{
            (e)=>{console.log(e)}
        }
    }
        findAndDelete();
});

app.get("/user", (req, res)=>{
    var findUser= async function(){
        try{
            var userFind= await user.find({});
            res.render("user", {
                data: userFind
            })
        }
        catch{
            (e)=>{console.log(e)}
        }
    };
    findUser();
})
app.get("/search/user/", (req, res)=>{
    let findUser= async function(){
        try{
            let id= req.query.search;
            let findUser= await user.findOne({_id: id})
            console.log(findUser)
            res.render("userView", {
                data: findUser
            })
        }
        catch{
            (e)=>{console.log(e)}
        }
    };
    findUser();
})
app.get("/cart", (req, res)=>{
    var findCart= async function(){
        try{
            let findCart=await cartDB.find().sort({date: -1});
            res.render("cart", {
                data: findCart
            })
         }
          catch{
            (e)=>{
                console.log(e)
            }
        }
    };
    findCart();
});

app.get("/order/register", (req, res)=>{
    var findOrderRegister= async function(){
        try{
            let order= await orderDB.find().sort({date: -1});
            res.render("orderRegister", {
                data: order
            })
        }catch{
            (e)=>{console.log(e)}
        }
    };
    findOrderRegister();
})

app.get("/orderRegiester/view/:id", (req, res)=>{
    var FindOrderById= async function(){
        try{
            let id= req.params.id;
        let find= await orderDB.findOne({_id: id});
        res.render("viewOrder", {
            data: find
        })
        }
        catch{
            (e)=>{console.log(e)}
        }
    };FindOrderById();
});
app.get("/order/unregister", (req, res)=>{
    var findUnregister= async function(){
        try{
            let find=await orderUnregisterDB.find().sort({date: -1});
            res.render("orderUnregister", {
                data: find
            })
        }catch{
            (e)=>{console.log(e)}
        }
    };
    findUnregister();
});
app.get("/orderUnregiester/view/:id", (req, res)=>{
    var orderUnregisterANdProcess= async function(){
        let id= req.params.id;
        try{
            let findUnregister= await orderUnregisterDB.findOne({_id: id});
            console.log(findUnregister);
            res.render("viewOrderUnregister", {
                data: findUnregister
            })
        }
        catch{
            (e)=>{console.log(e)}
        }
    };orderUnregisterANdProcess();
})

app.post("/procress/register/:id", (req, res)=>{
    var findOrderAndProcess= async function(){
        let i=req.params.id;
        let id= i.toString()
        try{    
            let findOrder= await orderDB.findByIdAndRemove({_id: id},{
                new: true, useFindAndModify: false
            });
            let process= new processDB({
                _id: findOrder._id,
                userId: findOrder.userId,
                paymentMethod: findOrder.paymentMethod,
                userDetails: findOrder.userDetails,
                orderDetails: findOrder.orderDetails,
            });
            let findUser= await user.findOne({_id:findOrder.userId})
            let order= findUser.order
            console.log(order)
            let a=order.filter((val, i)=>{
                return(val!= id)
            })
            let bc= findUser.order= a;
            let b= await findUser.save()
            let save= await process.save();
            res.render("delieveredPrint", {
                data: save
            })
        }catch{
            (e)=>{console.log(e)}
        }
    };
    findOrderAndProcess();
});
app.post("/procress/unregister/:id", (req, res)=>{
    var findUnregisterOrderAndProcess= async function(){
        try{    
            let id= req.params.id
            console.log("REACHED1")
            let findOrder= await orderUnregisterDB.findByIdAndRemove({_id: id},{
                new: true, useFindAndModify: false
            });
            let userDetail={
                 name: findOrder.name,
                 email: findOrder.email,
                 phone: findOrder.phone,
                 whatsapp: findOrder.whatsapp,
                 address: findOrder.address
            };
            console.log(userDetail);
            let o= {
                id: findOrder._id,
                img: findOrder.img,
                title: findOrder.title,
                price: findOrder.findOrder,
                quantity: findOrder.quantity,
                colors: findOrder.colors,
                sizes: findOrder.sizes,
                message: findOrder.message
            };
            console.log(`ORDER DETAILS : ${o.id} ${o.img} ${o.title}`);

            let process= new processDB({
                _id: findOrder._id,
                paymentMethod: findOrder.paymentMethod,
                orderDetails: o,
                userDetails: userDetail
            });
            console.log("REACHED2")
            let save= await process.save();
            console.log(save);
            res.render("delieveredPrint", {
                data: save
            })
        }catch{
            (e)=>{console.log(e)}
        }
    };
    findUnregisterOrderAndProcess();
});

app.get("/process", (req, res)=>{
    var findProcess= async function(){
        try{
            let find= await processDB.find().sort({date: -1});
            res.render("process", {
                data: find
            })
        }
        catch{
            (e)=>{console.log(e)}
        }
    };
    findProcess();
});
app.get("/process/view/:id", (req, res)=>{
    let findProcess= async function(){
        try{
            let id=req.params.id;
            let find= await processDB.findOne({_id: id});
            console.log(find);
            res.render("processView",{
                data: find
            })
        }catch{
            (e)=>{console.log(e)}
        }
    };
    findProcess();
});
app.post("/delievered/:id", (req, res)=>{
    console.log(req.params.id)
    let d= async function(){
        try{    
            let id= req.params.id
            let findProcess= await processDB.findByIdAndRemove({_id: id}, {
                new: true, useFindAndModify: false
            });
            console.log(`FIND PROCES ${findProcess}`)
            let delievered= new delieveredDB({
                _id: findProcess._id,
                userId: findProcess.userDetails.id,
                orderDetails: findProcess.orderDetails,
                paymentMethod: findProcess.paymentMethod,
                userDetails: findProcess.userDetails
            });
            let deliever=await delievered.save();
            console.log(`DELIEVERED ${deliever}`)
            if(!deliever.userDetails.id|| deliever.userDetails.id== null ||deliever.userDetails.id==undefined ||deliever.userDetails.id.length==0){
                console.log("REACHED A")
                res.redirect("/process")
            }
            else{
                var f_user= async function(){
                    let userId= deliever.userDetails.id;
                    console.log("REACHED B")
                    try{
                        let findUser= await user.findOne({_id: userId});
                        console.log(`FIND USER ${findUser}`);
                        let a= findUser.received=findUser.received.concat(delievered._id);
                        console.log(a)
                        await findUser.save();

                        let f= findUser.order.find((val, i)=>{
                            let fi= val!==delievered._id;
                            console.log(fi)
                            return(fi)
                        })
                        let findAndUpdateOrder= await user.findByIdAndUpdate({_id: userId}, {$set: {
                            order:  f, _id: userId
                        }});
                        res.redirect("/process")
                    }catch{
                        (e)=>{console.log(e)}
                    }
                };
                f_user();
            }
        }catch{
            (e)=>{console.log(e)}
        }
    };
    d();
});
app.get("/n", (req, res)=>{
    res.render("n")
})
app.get("/delievered",(req, res)=>{ 
    var findDelievered = async function(){
        try{
            let find= await delieveredDB.find().sort({date: -1});
            if(find || find !== null || find != undefined){
                res.render("delievered", {
                    data: find
                })
            }
            else{
                res.render("delievered")
        }
        }
        catch{
            (e)=>{console.log(e)}
        }
    };
    findDelievered();
});
app.get("/delievered/view/:id", (req, res)=>{
    let findDelieveredAndView= async function(){
        try{
            let id=req.params.id;
            let find= await delieveredDB.findOne({_id: id}).sort({date: -1})
            console.log(find);
            res.render("delieveredView",{
                data: find
            })
        }catch{
            (e)=>{console.log(e)}
        }
    };
    findDelieveredAndView();
});

app.get("/search/:category/",(req,res)=>{
    let cate= req.params.category;
    let key=req.query.search;
    if(cate=="product"){
        let fp= async function(){
            try{
                let find= await product.find({_id: key});
            res.render("index", {
                data: find
            })
            }
            catch{
                (e)=>{console.log(e)}
            }
        };
        fp();
    }
    else if(cate=="process"){
        let fpr= async function(){
            let find= await process.find({_id: key});
            res.render("process", {
                data: find
            })
        };
        fpr();
    }   else if(cate=="orderRegister"){
        let fpr= async function(){
            try{
                let find= await orderDB.find({_id: key});
                res.render("orderRegister", {
                    data: find
                })
            }
            catch{
                (e)=>{console.log(e)}
            }
        };
        fpr();
    }   else if(cate=="orderUnregister"){
        let fpr= async function(){
            try{
                let find= await orderUnregisterDB.find({_id: key});
            res.render("orderUnregister", {
                data: find
            })
            }
            catch{
                (e)=>{console.log(e)}
            }
        };
        fpr();
    }   else if(cate=="delievered"){
        let fpr= async function(){
            try{
                let find= await delieveredDB.find({_id: key});
            res.render("delievered", {
                data: find
            })
            }
            catch{
                (e)=>{console.log(e)}
            }
        };
        fpr();
    }   else if(cate=="user"){
        let fpr= async function(){
           try{ 
            let find= await user.find({_id: key});
            res.render("userView", {
                data: find
            })
           }
           catch{
               (e)=>{console.log(e)}
           }
        };
        fpr();
    }
})

app.post("/remove/:cate/:id", (req, res)=>{
    let id= req.params.id;
    let cate= req.params.cate;
    if(cate==="register"){
        var findAndRemove = async function(){
            try{
                let find= await orderDB.findByIdAndRemove({_id: id},{
                    new: true, useFindAndModify: false
                })
                let findUser= await user.findOne({_id: find.userId});
                let order= findUser.order;
                let d= order.filter((val,i)=>{
                    let a= val != id
                    return(a)
                })
                console.log(`D: ${d}`)
                let update= await user.findByIdAndUpdate({_id: findUser._id},{order: d}, {
                    new: true, useFindAndModify: false
                })
                res.redirect("/order/register")
            }
            catch{
                (e)=>{console.log(e)}
            }
        };
        findAndRemove();    

    }
    else{
        let justRemove= async function(){
            try{
                let find= await orderUnregisterDB.findByIdAndRemove({_id: id},{
                    new: true, useFindAndModify: false
                })
                res.redirect("/order/unregister")
            }
            catch{
                (e)=>{console.log(e)}
            }
        };
        justRemove();
    }
});
app.get("/feed", (req, res)=>{
    var findFeed= async function(){
        try{
            let data= await feed.find();
            res.render("feed", {
                data: data
            })
        }
        catch{
            (e)=>{console.log(e)}
        }
    };
    findFeed();
})
//LISTENING APP
app.listen(port, ()=>{
    console.log(`CONNECTED AT PORT NO: ${port}`)
})