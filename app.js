const UssdMenu = require('ussd-builder');
const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const pool = require('./utils/dbconnector');
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
const tips = [
    "Fearless & Peacefull",
  
         "Hold hands March together"
    
   
   
];

const getRandomTip = () => tips[Math.floor(Math.random() * tips.length)];

const getMainMenuText = () => `${getRandomTip()}\n1. Meetup Points \n2. MEDICAL EMERGENCY\n3. ARRESTED?\n4. Report Brutality\n5. How my MP voted\n6. Support Us\n7. REPORT MISSING PERSONS`;

menu.startState({
    run: () => {
        menu.con(getMainMenuText());
    },
    next: {
        '1': 'meetupPoints',
        '2': 'medicalEmergency',
        '3': 'factsAboutTheBill',
        '4': 'submitTip',
        '5': 'voteUpdate',
        '6': 'supportUs',
        '7': 'missingPersons'
    }
});

menu.state('main', {
    run: () => {
        menu.con(getMainMenuText());
    },
    next: {
        '1': 'meetupPoints',
        '2': 'medicalEmergency',
        '3': 'factsAboutTheBill',
        '4': 'submitTip',
        '5': 'voteUpdate',
        '6': 'supportUs',
          '7': 'missingPersons'
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
        
    
        const normalizedUserInput = userInput.replace(/'/g, "").replace(/\s+/g, " ");

        const matchingEntries = jsonData.filter(entry => {
            const normalizedConstituency = entry.Constituency.toUpperCase().replace(/'/g, "").replace(/\s+/g, " ");
            return normalizedConstituency.startsWith(normalizedUserInput);
        });

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

menu.state('missingPersons', {
    run: () => {
        menu.con('Missing Persons Report\n1. Submit a report\n\n0. Home');
    },
    next: {
        '1': 'missingPersons.name',
        '0': 'main'
    }
});

menu.state('missingPersons.name', {
    run: () => {
        menu.con('Please enter the name of the missing person:');
    },
    next: {
        '*\\w+': 'missingPersons.age'
    }
});

menu.state('missingPersons.age', {
    run: () => {
        const reportData = { name: menu.val };
        menu.con(`${reportData.name}\n\nPlease enter the age of the missing person:`);
        menu.next('missingPersons.description', reportData);
    },
    next: {
        '*\\d+': 'missingPersons.description'
    }
});

menu.state('missingPersons.description', {
    run: () => {
        const reportData = menu.args;
        reportData.age = menu.val;
        menu.con('Please enter a brief description of the missing person:');
        menu.next('missingPersons.location', reportData);
    },
    next: {
        '*\\w+': 'missingPersons.location'
    }
});

menu.state('missingPersons.location', {
    run: () => {
        const reportData = menu.args;
        reportData.description = menu.val;
        menu.con('Please enter the last known location of the missing person:');
        menu.next('missingPersons.contact', reportData);
    },
    next: {
        '*\\w+': 'missingPersons.contact'
    }
});

menu.state('missingPersons.contact', {
    run: () => {
        const reportData = menu.args;
        reportData.location = menu.val;
        menu.con('Please enter your contact number:');
        menu.next('missingPersons.submit', reportData);
    },
    next: {
        '*\\d+': 'missingPersons.submit'
    }
});

menu.state('missingPersons.submit', {
    run: async () => {
        const reportData = menu.args;
        reportData.contact = menu.val;

     
        const report = `Missing Person Report:\nName: ${reportData.name}\nAge: ${reportData.age}\nDescription: ${reportData.description}\nLast Known Location: ${reportData.location}\nContact: ${reportData.contact}`;

    
        const query = {
            text: 'INSERT INTO missing_persons (name, age, description, last_known_location, contact) VALUES ($1, $2, $3, $4, $5)',
            values: [reportData.name, reportData.age, reportData.description, reportData.location, reportData.contact],
        };

        try {
            await pool.query(query);
            menu.end('Your missing person report has been submitted and Posted at www.lostinkenya.org');
        } catch (err) {
            console.error('Error saving to database:', err);
            menu.end('There was an error submitting your report. Please try again.');
        }
    }
});

menu.state('meetupPoints', {
    run: () => {
        menu.con('Choose a road:\n1. Mombasa Road\n2. Langata Road\n3. Ngong Road\n4. Thika Road\n5. Waiyaki Way\n\n0. Back');
    },
    next: {
        '1': 'meetupPoints.mombasaRoad',
        '2': 'meetupPoints.langataRoad',
        '3': 'meetupPoints.ngongRoad',
        '4': 'meetupPoints.thikaRoad',
        '5': 'meetupPoints.waiyakiWay',
        '0': 'main'
    }
});

menu.state('meetupPoints.mombasaRoad', {
    run: () => {
        menu.con('Mombasa Road Points:\n- Ole Sereni\n- JKIA Gate\n- Expressway Exit\n- EPZ\n- Namanga Bound\n\n0. Back');
    },
    next: {
        '0': 'meetupPoints'
    }
});

menu.state('meetupPoints.langataRoad', {
    run: () => {
        menu.con('Langata Road Points:\n- Tmall Junction\n- Galleria towards CUEA\n- Kiserian\n- Upper Kajiado\n\n0. Back');
    },
    next: {
        '0': 'meetupPoints'
    }
});

menu.state('meetupPoints.ngongRoad', {
    run: () => {
        menu.con('Ngong Road Points:\n- Daystar Round About\n- Ringroad Junction\n- Southern Bypass\n\n0. Back');
    },
    next: {
        '0': 'meetupPoints'
    }
});

menu.state('meetupPoints.thikaRoad', {
    run: () => {
        menu.con('Thika Road Points:\n- Thika Town\n- Makongeni\n- Weteithie\n- Juja\n- Ruiru\n- Bypass\n- Muthaiga\n- GardenCity\n\n0. Back');
    },
    next: {
        '0': 'meetupPoints'
    }
});

menu.state('meetupPoints.waiyakiWay', {
    run: () => {
        menu.con('Waiyaki Way Points:\n- Kinoo\n- Uthiru\n- Kangemi\n- Gitaru Interchange\n\n0. Back');
    },
    next: {
        '0': 'meetupPoints'
    }
});
menu.state('factsAboutTheBill', {
    run: () => {
        menu.con('If you or anyone you know has been arrested during the protest Kindly call this toll free number \n -0800 720 434\n\n0. Back');
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
        menu.con('Type your message here:');
    },
    next: {
        '*\\w+': 'submitTip.ussd.tip'
    }
});

menu.state('submitTip.ussd.tip', {
    run: async () => {
        const tip = menu.val;
        await sendEmail(tip);
        menu.end('Your message has been sent to Amnesty Kenya .');
    }
});

menu.state('supportUs', {
    run: () => {
          menu.end('To support this, please use the following details:\n- MPESA: 0725 899698');
    },
    next: {
        '1': 'supportUs.donate',
        '0': 'main'
    }
});

menu.state('supportUs.donate', {
    run: () => {
        menu.end('Send your donations to this number:\n- MPESA:0725 899698 ');
    }
});

menu.state('medicalEmergency', {
    run: () => {
        menu.con('If in need of medical assistance call \n 0708 311 740 \n 0739 567 483\n\n0. Back');
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