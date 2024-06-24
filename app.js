const UssdMenu = require('ussd-builder');
const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

let menu = new UssdMenu();

let jsonData = [];
fs.readFile(path.join(__dirname, 'csvjson.json'), 'utf8', (err, data) => {
    if (err) {
        console.error('Error reading JSON file:', err);
    } else {
        jsonData = JSON.parse(data);
    }
});


const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, 
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendEmail = async (tip) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: 'amnesty.kenya@amnesty.or.ke',
        subject: 'New Anonymous Tip Received',
        text: `A new anonymous tip has been received:\n\n${tip}`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully');
    } catch (error) {
        console.error('Error sending email:', error);
    }
};

// Main menu
const mainMenuText = '#RejectFinanceBill2024\n1. How my MP voted\n2. Medical Emergency\n3. Report Brutality\n4. Legal Assistance\n5. Support Us';

menu.startState({
    run: () => {
        menu.con(mainMenuText);
    },
    next: {
        '1': 'voteUpdate',
        '2': 'medicalEmergency',
        '3': 'submitTip',
        '4': 'factsAboutTheBill',

        '5': 'supportUs'
    }
});
menu.state('main',{
    run: () => {
        menu.con(mainMenuText);
    },
    next: {
        '1': 'voteUpdate',
        '2': 'medicalEmergency',
        '3': 'submitTip',
        '4': 'factsAboutTheBill',
        
        '5': 'supportUs'
    }
});
menu.state('voteUpdate', {
    run: () => {
        menu.con('Enter the name of your Constituency or county:');
    },
    next: {
        '*\\w+': 'processVoteQuery'
    }
});

menu.state('processVoteQuery', {
    run: () => {
        let userInput = menu.val.trim().toUpperCase();

     
        const cleanedUserInput = userInput.replace(/\s*\(.*\)$/, '');

        const matchingEntries = jsonData.filter(entry => entry.Constituency.toUpperCase().startsWith(cleanedUserInput));

        if (matchingEntries.length > 0) {
            let response = '';
            matchingEntries.forEach(entry => {
                response += `${entry.Constituency}\nYour MP ${entry.Name} (${entry.Party}) voted ${entry.Vote}\n\n`;
            });
            response += '0. Home';
            menu.con(response);
        } else {
            menu.con(`No data found for ${userInput}. Please ensure you entered the correct Constituency name.\n\n0. Home`);
        }
    },
    next: {
        '0': 'main'
    }
});


menu.state('factsAboutTheBill', {
    run: () => {
        menu.con('Kindly Get in touch with LSK hotline \n -0800 720 434\n\n0. Back');
    },
    next: {
        '0': 'main'
    }
});

menu.state('askGpt', {
    run: () => {
        menu.end('Tuesday 25th #TotalshutdownKE');
    }
});

menu.state('submitTip', {
    run: () => {
        menu.con('Submit your anonymous tip/ Police brutality:\n1. Share now\n2. Via Independent Journalists\n\n0. Home');
    },
    next: {
        '1': 'submitTip.ussd',
        '2': 'submitTip.ind',
        '0': 'main'
    }
});

menu.state('submitTip.signal', {
    run: () => {
        menu.end('To submit a tip via Signal, please send your tip to Signal number: +123456789.');
    }
});

menu.state('submitTip.ind', {
    run: () => {
        menu.end('To submit a tip via Independent Journalists, please contact John Allan Namu via X(TWITTER).');
    }
});

menu.state('submitTip.ussd', {
    run: () => {
        menu.con('Type your anonymous tip:');
    },
    next: {
        '*\\w+': 'submitTip.ussd.tip'
    }
});

menu.state('submitTip.ussd.tip', {
    run: async () => {
        const tip = menu.val;
        await sendEmail(tip);
        menu.end('Your message has been received.');
    }
});

menu.state('supportUs', {
    run: () => {
          menu.end('To donate for Protesters, please use the following details:\n- MPESA: 0705 529 629');
    },
    next: {
        '1': 'supportUs.donate',
        '0': 'main'
    }
});

menu.state('supportUs.donate', {
    run: () => {
        menu.end('Send your donations to this number:\n- MPESA: 0705 529 629');
    }
});

menu.state('medicalEmergency', {
    run: () => {
        menu.con('If in need of medical assistance call \n 0708311740 \n 0739567483\n\n0. Back');
    },
    next: {
        '0': 'main'
    }
});

app.post('/ussd', (req, res) => {
    menu.run(req.body, ussdResult => {
        res.send(ussdResult);
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
