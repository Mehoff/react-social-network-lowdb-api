import { join } from 'path'
import { Low, JSONFile } from 'lowdb'
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcrypt';
import validator from 'validator';
import jwt from 'jsonwebtoken';
import { requireAuth } from './requireAuth.js'

const PORT = 3001
const maxAge = 3 * 24 * 60 * 60;
const SECRET = 'react-social-network-secret'



const app = express();
app.use(cors())
app.use(express.urlencoded())
app.use(express.json())
app.use(cookieParser())

// app.use(
//     jwt({
//       secret: SECRET,
//       getToken: req => req.cookies.token
//     })
//   );


const __dirname = path.dirname(fileURLToPath(import.meta.url))
const file = join(__dirname, 'db.json')
const adapter = new JSONFile(file)
const db = new Low(adapter)

await db.read()


// POST: 

app.post('/signup', async (req, res) =>  {
    const {email, password, age, name, gender, about} = req.body;

    var response = validateRegisterData(email, password, age);

    if(response.error){
        res.status(400).json(response.error)
        return;
    }

    const salt = await bcrypt.genSalt();
    let hashedPassword = await bcrypt.hash(password, salt);

    let User = {
        id: getNextId(db.data.users),
        name: name,
        email: email,
        password: hashedPassword,
        imageUrl: null,
        age: age,
        gender: gender,
        about: about
    }

    try{
        db.data.users.push(User);
        await db.write()

        const token = createToken(User.id)
        res.cookie('jwt', token, {httpOnly: true, maxAge: maxAge * 1000})
        res.status(201).json({user: User.id})
    }
    catch(err){
        console.log(err);
        res.status(400).json({error: err.message})
    }
})



app.post('/signin', async (req, res) =>{
    const {email, password} = req.body;

    console.log(req.cookies)


    try{
        await db.read();
        let user = db.data.users.find(user => user.email == email);
        if(user){
            const auth = await bcrypt.compare(password, user.password);
            if(auth){
                const token = createToken(user.id);
                res.cookie('jwt', token, {httpOnly: true, maxAge: maxAge * 1000})
                res.status(201).json({id: user.id})
                return;
            }
            res.status(401).json({error: "Incorrent Password"})
            return
        }
        res.status(401).json({error: "Incorrect Email"})
        return
    }
    catch(err){
        res.status(400).json({error: err.message})
        return
    }
})


// GET:  //

app.get('/users', async (req, res) => {
    let response = await getAllUsers();

    if(response.error){
        res.status(400).json(response.error);
        return;
    }

    res.status(201).json(response);
})

app.get('/avatar_placeholder', (req, res) => {
    const path = __dirname  + "\\resources\\avatar_placeholder.png"
    res.status(200).sendFile(path)
})

app.get('/currentUser', async (req, res) => {
    if(req.cookies.jwt){
        const decoded = jwt.decode(req.cookies.jwt);
        await db.read()

        const user = db.data.users.find(user => user.id == decoded.id);
        if(user){
            res.status(201).json({id: user.id})
        }
        else{
            console.log("User was not found")
            res.status(401).json({error: "User was not found"})
        }
    }
    else{
        res.status(200).json({error: "No current user"})
    }
})


app.post('/userData', async (req, res) => {

    console.log('/userData')
    console.log(req.body.id)

    if(req.body.id){
        const userData = await getUserData(req.body.id);
        console.log(userData)
        if(userData.error){
            res.status(401).json(userData)
        } else{
            console.log(userData);
            res.status(200).json(userData);
        }
    }
})

app.get('/logout', (req, res) => {
    res.cookie('jwt', '', {httpOnly: true, maxAge: 1})
    res.json({status: 'ok'})
})


// METHODS:

async function getUserData(id){

    console.log('getUserData', id);

    await db.read();
    const user = db.data.users.find(user => user.id == id);
    if(!user){
        return{error: `User with specified id (${id}) not found`};
    }

    return user;
}

async function getAllUsers(){
    await db.read();
    return db.data.users;
} 

function validateRegisterData(email, password, age)
{
    if(!validator.isEmail(email))
        return {error: "Email is not valid"}
    if(!(password.length > 6))
        return {error: "Minimum password length is 6 characters"}
    if(db.data.users.find(u => u.email == email) != null)
        return {error: "User with this email is already registered"}
    if(age < 18){
        return {error: "Users with age below 18 are not allowed"}
    }

    return true;
}

function getNextId(collection){
    let maxId = 0;
    for(const item of collection){
        if(maxId < item.id)
            maxId = item.id
    }
    return maxId + 1;
}

const createToken = (id) => {
  return jwt.sign({ id }, SECRET, {
    expiresIn: maxAge
  });
};


app.listen(PORT);
console.log(`App is listening on port: ${PORT}`)

