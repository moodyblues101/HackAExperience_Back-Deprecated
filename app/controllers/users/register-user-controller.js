"use strict";

const Joi = require('joi');
const bcrypt = require('bcryptjs/dist/bcrypt');
const randomstring = require('randomstring')
const createJsonError = require('../../errors/create-json-error');
const throwJsonError = require('../../errors/throw-json-error');
const { createUser, getUserByEmail } = require('../../repositories/users-repository');
const { sendMailRegister } = require('../../helpers/sendgrid');

const schema = Joi.object().keys({
    name: Joi.string().min(4).max(120).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(4).max(20).required(), // look for improvement in doc 
    verifyPassword: Joi.ref('password'),
});

async function registerUser(req, res) {
    try {
        const { body } = req;
        await schema.validateAsync(body);
        const { name, email, password } = body;
        // console.log('password', password);
        const user = await getUserByEmail(email);
        if (user) {
            throwJsonError(400, 'Ya existe un usuario registrado con ese mail')
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const verificationCode = randomstring.generate(64);
        const userDB = { name, email, passwordHash, verificationCode };
        const userId = await createUser(userDB)
        await sendMailRegister(name, email, verificationCode);
        const activationLink = `http://localhost:3000/api/v1/users/activation?code=${verificationCode}`;
        res.status(201);
        res.send({
            id: userId,
            activationLink,
        });
    } catch (error) {
        createJsonError(error, res);
    }
}

module.exports = registerUser;