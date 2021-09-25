const { google } = require('googleapis');
const express = require('express');
require('dotenv').config();
const app = express();

let sheets;

const setup = async () => {
	const auth = await google.auth.getClient({ scopes: ['https://www.googleapis.com/auth/spreadsheets'] });

	sheets = google.sheets({ version: 'v4', auth });
};

app.use(express.json());

app.post('/addHackathon', async (req, res) => {
	const newHackathonID =
		(
			await sheets.spreadsheets.values.get({
				spreadsheetId: process.env.SHEET_ID,
				range: `Sheet2!A:C`,
			})
		).data.values.length + 1;
	const { hackathon } = req.body;

	const response = await sheets.spreadsheets.values.append({
		spreadsheetId: process.env.SHEET_ID,
		range: 'Sheet2!A:C',
		valueInputOption: 'USER_ENTERED',
		resource: {
			values: [[newHackathonID, hackathon.name, hackathon.website]],
		},
	});

	res.send({
		...hackathon,
		updatedRange: response.data.updates.updatedRange,
	});
});

app.get('/participants', async (req, res) => {
	const rangeParticipants = `Sheet1!A2:B`;
	const rangeHackathons = `Sheet2!A2:C`;

	const response = await Promise.all([
		sheets.spreadsheets.values.get({
			spreadsheetId: process.env.SHEET_ID,
			range: rangeParticipants,
		}),
		sheets.spreadsheets.values.get({
			spreadsheetId: process.env.SHEET_ID,
			range: rangeHackathons,
		}),
	]);

	const participants = response[0].data.values;
	const hackathons = response[1].data.values;

	const participantsWithHackathons = participants.map((participant) => {
		const hackathon = hackathons.find((hackathon) => hackathon[0] === participant[1]);

		return {
			name: participant[0],
			hackathon: hackathon ? hackathon[1] : '',
			website: hackathon ? hackathon[2] : '',
		};
	});
	res.send(participantsWithHackathons);
});

app.get('/hackathon/:id', async (req, res, next) => {
	const id = req.params.id;

	if (id < 2 || isNaN(id)) {
		res.send('Invalid hackathon id');
		next();
	}

	const range = `Sheet2!A:C`;

	const response = await sheets.spreadsheets.values.get({
		spreadsheetId: process.env.SHEET_ID,
		range,
	});

	if (id > response.data.values.length) {
		res.send('Hackathon ID must be less than the number of rows in the sheet');
		next();
	}

	res.send({
		id,
		name: response.data.values[id - 1][1],
		website: response.data.values[id - 1][2],
	});
	next();
});

app.get('/', (req, res) => {
	res.send('Successful response.');
});
app.listen(process.env.PORT || 8000, () => {
	setup();
	console.log(`Server is listening on port ${process.env.PORT || 8000}`);
});
