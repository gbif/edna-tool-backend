import config from '../../config.js'
import db from '../db/index.js'
import axios from 'axios'



async function login(auth) {
    let loginRequest = {
        url: `${config.gbifBaseUrl}user/login`,
        method: 'get',
        headers: {
            authorization: auth
        }
    };
    try {
        let response = await axios(loginRequest);
        return response?.data;
    } catch (error) {
        console.log(error)
        throw error
    }
    
}

async function getFromToken(auth) {
    
    let options = {
        method: 'post',
        url: `${config.gbifRegistryBaseUrl}user/whoami`,
        headers: {
            authorization: auth
        }
        
    };
    

    try {
        let response = await axios(options);
        let user = response?.data;
        if(user){
            const datasets = await db.getUserDatasets(user?.userName)
            return {...user,datasets: datasets, token: response?.headers?.token || ''};
        } else {
            throw "No user from that token, expired?"
        }
        

    } catch (error) {
        console.log(error)
        throw error;  
    }
    
} 

export default {
    
    login: login,
    getFromToken: getFromToken
};