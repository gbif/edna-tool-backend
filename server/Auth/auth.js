'use strict';
import compose from 'composable-middleware';
import User from './user.model.js';
import {readAdminFile, writeAdminFile} from '../../util/filesAndDirectories.js'


const appendUser = () => {
    return compose()
    // Attach user to request
        .use(function(req, res, next) {
            User.getFromToken(req?.headers?.authorization)
            .then((user) => {
                if (user) {
                    req.user = user;
                    res.setHeader('token', user?.token);
                } else {
                   // removeTokenCookie(res);
                    res.removeHeader('token');
                    delete req.user;
                }
                
                next();
            })
            .catch(function(err) {
               
                res.sendStatus(err?.response?.status || 500)
               // next(err);
            });
        });
}

const userCanModifyDataset = () => {
    return compose()
    // Attach user to request
        .use(function(req, res, next) {
            User.getFromToken(req?.headers?.authorization)
            .then((user) => {
                if (user) {
                    req.user = user;
                    res.setHeader('token', user?.token);
                    const datasets = user?.datasets || [];

                    if(datasets.map(d => d.dataset_id).includes(req?.params?.id)){
                        console.log('userCanModifyDataset true')
                        next();
                    }

                } else {
                    console.log('userCanModifyDataset false')
                    res.removeHeader('token');
                    delete req.user;
                    res.sendStatus(403)
                }
                
            })
            .catch(function(err) {
                console.log('userCanModifyDataset false')
                res.sendStatus(err.statusCode || 403)
               // next(err);
            });
        });
}

export const userCanPublishWithOrganisation = async (userName, organisationKey) => {
    try {
        const admin = await readAdminFile();
        return admin?.organizations?.[organisationKey]?.includes(userName)
    } catch (error) {
        console.log(error)
        throw error;
    }
}

export const userIsAdmin = async (userName) => {
    try {
        const admin = await readAdminFile();
        return admin?.admin?.includes(userName)
    } catch (error) {
        console.log(error)
        throw error;
    }
}

export const getOrganisationsForUser = async (userName) => {
    try {
        const admin = await readAdminFile();
        if(admin?.admin?.includes(userName)){
            return Object.keys(admin?.organizations || {}).map(key => ({key, name: admin?.organizations?.[key]?.name}))
        } else {
            return Object.keys(admin?.organizations || {}).filter(key => admin?.organizations?.[key]?.users?.includes(userName) ).map(key => ({key, name: admin?.organizations?.[key]?.name}))
        }
    } catch (error) {
        console.log(error)
        throw error;
    }
}

export default {
    appendUser,
    userCanModifyDataset,
    userCanPublishWithOrganisation,
    userIsAdmin,
    getOrganisationsForUser
}