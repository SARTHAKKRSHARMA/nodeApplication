const express = require('express')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const passport = require('passport')
const LocalStrategy = require('passport-local')
const passportLocalMongoose = require('passport-local-mongoose')
const expressSession = require('express-session')

const app = express()
const port = process.env.PORT || 3000


const MongoClient = require('mongodb').MongoClient;
const uri = "mongodb+srv://Sarthak:10111971@cluster0-adffp.gcp.mongodb.net/test?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true });
client.connect(err => {
  const collection = client.db("demoDB").collection("User");
  // perform actions on the collection object
  client.close();
});



// mongoose.connect('mongodb+srv://Sarthak:<password>@cluster0-adffp.gcp.mongodb.net/test?retryWrites=true&w=majority/demoDb',{
//     useCreateIndex:true,
//     useNewUrlParser:true,
//     useUnifiedTopology:true
// })

const userSchema = new mongoose.Schema({
    username:{
        type:String,
        required:true,
        unique:true,
        trim:true
    },
    password:{
        type:String,
        trim:true
    },
    friends:[{
        type:String
    }],
    wantToBeFriends:[{
        type:String
    }]
})

userSchema.plugin(passportLocalMongoose)


const User = mongoose.model('User',userSchema)


app.use(expressSession({
    secret:"East or West GoGaga is the Best",
    resave:false,
    saveUninitialized:true
}))
app.use(bodyParser.urlencoded({extended:true}))
app.set('view engine','ejs')
app.use(passport.initialize())
app.use(passport.session())
app.use((req, res, next) => {
    res.locals.currentUser = req.user
    next()   
})

function isLoggenIn(req, res, next){
    if(req.isAuthenticated()){
        return next()
    }
    res.redirect('/login')
}

passport.use(new LocalStrategy(User.authenticate()))
passport.serializeUser(User.serializeUser())
passport.deserializeUser(User.deserializeUser())

//Router
app.get('/',(req, res) => {
    res.render('index')
})

app.get('/register',(req, res) => {
    res.render('register')
})

app.post('/register',async (req, res) => {
    try{
        const username = req.body.username
        const password = req.body.password
        const user =  await User.register(new User({username}),password)
        await user.save()
        console.log(user)
        passport.authenticate('local')(req, res, () => {
            res.redirect('/')
        })
    }catch(e){
        console.log(e)
        res.send(e)
    }
})

app.get('/login',(req, res) => {
    res.render('login')
})

app.post('/login',passport.authenticate('local',{
    successRedirect:'/',
    failureRedirect:'/login'
}),(req, res) => {
})

app.get('/logout',isLoggenIn,(req, res) => {
    req.logOut()
    res.redirect('/login')
})

app.get('/gogaga/list.html',isLoggenIn,async(req, res) => {
    try{
        res.render('list')        
    }catch(e){
        res.send(e)
    }
})

app.post('/find',isLoggenIn,(req, res) => {
    console.log(req.body.user)
    res.redirect('/find/' + req.body.user)
})

app.get('/find/:username',isLoggenIn,async(req, res) => {
    const user = await User.find({})
    users = []
    user.forEach((u) => {
        if(u.username.includes(req.params.username)){
            users.push(u)
        }
    })
    users = users.filter((user) => {
        return user.username !== req.user.username
    })
    res.render('findFriend',{users:users,username:req.params.username})
})


app.post('/:id/addFriend/:username',isLoggenIn,async(req, res) => {
    try{
        const user = await User.findById(req.params.id)
        user.wantToBeFriends.push(req.user.username)
        await user.save()
        res.redirect('/find/'+req.params.username)
    }catch(e){
        res.send(e)
    }
})

app.get('/addFriend',isLoggenIn,async(req, res) => {
    try{
        const user = await User.findOne({username:req.user.username})
        res.render('confirmFriend',{user:user})
    }catch(e){
        res.send(e)
    }
})

app.post('/confirmRequest/:username',isLoggenIn,async(req, res) => {
    req.user.wantToBeFriends = req.user.wantToBeFriends.filter((friend) => {
        return friend !== req.params.username
    })
    req.user.friends.push(req.params.username)
    await req.user.save()

    const user =  await User.findOne({username:req.params.username})
    user.friends.push(req.user.username)
    await user.save()

    res.redirect('/addFriend')
})

app.get('/user/:username',isLoggenIn,async(req, res) => {
    const user = await User.findOne({username:req.params.username})
    res.render('user',{user:user})
})

app.listen(port,() => {
    console.log("Server started at port "+ port)
})
