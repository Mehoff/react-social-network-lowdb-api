import jwt from 'jsonwebtoken';
const SECRET = 'react-social-network-secret'

export function requireAuth(req, res, next){
    const token = req.cookies.jwt;

    if(token){
        jwt.verify(token, SECRET, (err, decodedToken) => {
            if(err){
                console.log('Auth error');
                res.status(400).json({error: "Authentication error"})
            } else {
                console.log('requireAuth check ok')
                next()
            }
        })
    }
    res.status(400).json({error: "Authentication error"})
}