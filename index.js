// made by sahir (iKnow im also shocked)

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const last_season = {
    startYear: 2022,
    endYear: 2023
};
const first_season = {
    startYear: 2018,
    endYear: 2019
};

function isValidRequest(nba_season) {
    if (nba_season.startYear < first_season.startYear || nba_season.endYear > last_season.endYear) {
        return false;
    }

    return true;
}

function httpGetWithRetry(url, currentAttempt, maxAttempts) {
    return new Promise((resolve, reject) => {
        axios.get(url)
        .then(response => {
            resolve(response);
        })
        .catch(error => {
            console.log(`Error fetching url ${url}: ${error.code} ${error.response.statusText}`)

            if (currentAttempt < maxAttempts) {
                console.log(`Looks like attempt ${currentAttempt} failed, will retry since it's not past the max attempts ${maxAttempts}`);

                httpGetWithRetry(url, currentAttempt + 1, maxAttempts);
            } else {
                console.log(`Looks like attempt ${currentAttempt} failed, cannot retry since it's past the max attempts ${maxAttempts}`);

                reject(error);
            }
        });
    });
}

// not configuring maxAttempts to save from hella 429 rate limit exceeded, but it works :) proof: iGot blocked
function httpGet(url, maxAttempts = 1) {
    return httpGetWithRetry(url, 1, maxAttempts);
}

function getBoxScoresForDate(date) {
    return new Promise((resolve, reject) => {
        httpGet(`https://www.basketball-reference.com/boxscores/?&year=${date.year}&month=${date.month}&day=${date.day}`)
        .then(response => {
            // use cheerio to parse HTML
            const $ = cheerio.load(response.data);
            const gameSummary = [];
            $('.game_summary')
            .each((index, element) => {
                const teamsDiv = $(element).find('.teams');
                const roadTeam = $(teamsDiv).find('tr:nth-child(1) td:nth-child(1) a:nth-child(1)').text();
                const homeTeam = $(teamsDiv).find('tr:nth-child(2) td:nth-child(1) a:nth-child(1)').text();

                const secondTable = $(element).find('table:nth-child(2)');
                const periodTotals = [];

                $(secondTable).find('.center').each((_scoreIndex, scoreElement) => {
                    const periodTotal = parseInt($(scoreElement).text());
                    periodTotals.push(periodTotal);
                });

                const numPeriods = periodTotals.length / 2;
                const periodBreakdown = [];
                for (let i = 0; i < numPeriods; ++i) {
                    periodBreakdown.push({
                        period: i + 1,
                        roadTotal: periodTotals[i]
                    });
                }
                for (let i = numPeriods, j = 0; i < periodTotals.length; ++i, ++j) {
                    periodBreakdown[j].homeTotal = periodTotals[i];
                }

                gameSummary.push({
                    gameDate: `${date.year}-${date.month}-${date.day}`,
                    numExtraPeriods: numPeriods - 4,
                    periodBreakdown,
                    roadTeam,
                    homeTeam
                });
            });

            resolve(gameSummary);
        })
        .catch(error => {
            reject(error);
        });
    });
}

function previousDay(current_date) {
    const next_date = new Date(`${current_date.year}-${current_date.month}-${current_date.day}`);
    next_date.setDate(next_date.getDate() - 1);

    return {
        year: next_date.getUTCFullYear(),
        month: next_date.getUTCMonth() + 1,
        day: next_date.getUTCDate()
    };
}

function getCompactBoxScore(box_score) {
    return {
        gameDate: box_score.gameDate,
        roadTeam: box_score.roadTeam,
        homeTeam: box_score.homeTeam,
        numExtraPeriods: box_score.numExtraPeriods,
        periodBreakdown: box_score.periodBreakdown
    };
}

function getFileString(box_scores) {
    let compactBoxScores = '';

    box_scores.forEach(bs => {
        compactBoxScores += JSON.stringify(getCompactBoxScore(bs)) + '\n';
    });

    return compactBoxScores;
}

function readBoxScores(file_path) {
    const boxScores = [];
    const lines = fs.readFileSync(file_path, 'utf-8').split('\n');
    lines.pop();

    lines.forEach(line => {
        boxScores.push(JSON.parse(line));
    });

    return boxScores;
}

function sortFileByGameDate(file_path) {
    const sortedBoxScores = readBoxScores(file_path);

    sortedBoxScores.sort((a, b) => {
        return new Date(a.gameDate).getTime() - new Date(b.gameDate).getTime();
    });

    fs.writeFileSync(file_path, getFileString(sortedBoxScores));
}


function appendCompactBoxScores(box_scores, file_path) {
    fs.appendFileSync(file_path, getFileString(box_scores));
}

function decorateBoxScore(box_score) {
    let roadTeamTotal = 0;
    let homeTeamTotal = 0;

    box_score.periodBreakdown.forEach(pb => {
        roadTeamTotal += pb.roadTotal;
        homeTeamTotal += pb.homeTotal;
    });


    box_score.gameTotal = roadTeamTotal + homeTeamTotal;
    box_score.roadTeamTotal = roadTeamTotal;
    box_score.homeTeamTotal = homeTeamTotal;

    const homeWinner = homeTeamTotal > roadTeamTotal;
    box_score.winningTeam = homeWinner ? box_score.homeTeam : box_score.roadTeam;
    box_score.losingTeam = homeWinner ? box_score.roadTeam : box_score.homeTeam;
    box_score.winningTeamScore = homeWinner ? homeTeamTotal : roadTeamTotal;
    box_score.losingTeamScore = homeWinner ? roadTeamTotal : homeTeamTotal;
}

let show_message = true;
function doAfterSeconds(seconds, callback) {
    if (show_message) {
        console.log(`50/50 message: waiting ${seconds} seconds in between requests..`);

        show_message = Math.random() >= 0.5;
    }

    setTimeout(() => {
        callback();
    }, 1000 * seconds);
}

function getBoxScoresForDatesHelper(current_game_date, num_additional_days, daily_scores, resolve, reject, file_path, box_score_transformation) {
    getBoxScoresForDate(current_game_date)
    .then(boxScores => {
        console.log(`Fetched ${boxScores.length} games played on ${current_game_date.month}-${current_game_date.day}, ${num_additional_days} days left to query`);

        if (boxScores.length > 0) {
            boxScores.forEach(bs => {
                decorateBoxScore(bs);

                if (box_score_transformation != null) {
                    box_score_transformation(bs);
                }

                daily_scores.push(bs);
            });
        }

        if (num_additional_days == 0) {
            if (file_path) {
                fs.writeFileSync(file_path, JSON.stringify(daily_scores));
            }

            resolve(daily_scores);
        } else {
            const prev_game_date = previousDay(current_game_date);
            doAfterSeconds(20, () => {
                getBoxScoresForDatesHelper(prev_game_date, num_additional_days - 1, daily_scores, resolve, reject, file_path, box_score_transformation);
            });
        }
    })
    .catch(error => {
        reject(error);
    });
}

function getBoxScoresForDates(last_game_date, num_additional_days, file_path, box_score_transformation) {
    return new Promise((resolve, reject) => {
        getBoxScoresForDatesHelper(last_game_date, num_additional_days, [], resolve, reject, file_path, box_score_transformation);
    });
}

function getBoxScores(date) {
    return getBoxScoresForDates(date, 0);
}

function getSeasonScores(season_start_year, box_score_filter) {
    const season = {
        startYear: season_start_year,
        endYear: season_start_year + 1
    }

    if (!isValidRequest(season)) {
        return new Error(`Invalid season in request, you wanted ${season.startYear}-${season.endYear} but we only have ${first_season.startYear}-${last_season.endYear}`);
    }

    const filePath = `data/box_scores/${season.startYear}_${season.endYear}.txt`;
    const boxScores = readBoxScores(filePath);

    const decoratedBoxScores = [];
    boxScores.forEach(boxScore => {
        if (!box_score_filter || box_score_filter(boxScore)) {
            decorateBoxScore(boxScore);
            decoratedBoxScores.push(boxScore);
        }
    });

    return decoratedBoxScores;
}

function getSeasonScoresSimple(season_start_year, teams_to_include) {
    return getSeasonScores(season_start_year, (boxScore) => {
        if (!teams_to_include) {
            return true;
        }

        if (teams_to_include.includes(boxScore.roadTeam) || teams_to_include.includes(boxScore.homeTeam)) {
            return true;
        }

        return false;
    });
}

const bref = {}; // bref == basketball reference :)
bref.getBoxScores = getBoxScores;
bref.getBoxScoresForDates = getBoxScoresForDates;
bref.appendCompactBoxScores = appendCompactBoxScores;
bref.getSeasonScores = getSeasonScores;
bref.getSeasonScoresSimple = getSeasonScoresSimple;
bref.sortFileByGameDate = sortFileByGameDate;

module.exports = bref // npm link, npm link @sahirb/basketball-reference
