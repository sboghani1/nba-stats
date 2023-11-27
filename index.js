// made by sahir (iKnow im also shocked)

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const last_season = {
    startYear: 2022,
    endYear: 2023
};
const first_season = {
    startYear: 2006,
    endYear: 2007
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
            if (error.response) {
                console.log(`Error fetching url ${url}: ${error.code} ${error.response.statusText}`)
            } else {
                console.log(`Error fetching url ${url}: ${error.message.substring(0, 200)}`);
            }

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

function getPaddedNumber(number) {
    if (number < 10) {
        return `0${number}`;
    }

    return number;
}

function getTeamTLA(team, game_year, game_month) {
    if (team.includes('Atlanta')) {
        return 'ATL';
    }
    if (team.includes('Boston')) {
        return 'BOS';
    }
    if (team.includes('Brooklyn')) {
        return 'BRK';
    }
    if (team.includes('Charlotte')) {
        // hornets (2014-2015 onwards)
        if (game_year >= 2014) {
            if (game_year > 2014 || game_month > 7) {
                return 'CHO';
            }
        }

        return 'CHA'; // bobcats
    }
    if (team.includes('Chicago')) {
        return 'CHI';
    }
    if (team.includes('Cleveland')) {
        return 'CLE';
    }
    if (team.includes('Dallas')) {
        return 'DAL';
    }
    if (team.includes('Denver')) {
        return 'DEN';
    }
    if (team.includes('Detroit')) {
        return 'DET';
    }
    if (team.includes('Golden State')) {
        return 'GSW';
    }
    if (team.includes('Houston')) {
        return 'HOU';
    }
    if (team.includes('Indiana')) {
        return 'IND';
    }
    if (team.includes('LA Clippers')) {
        return 'LAC';
    }
    if (team.includes('LA Lakers')) {
        return 'LAL';
    }
    if (team.includes('Memphis')) {
        return 'MEM';
    }
    if (team.includes('Miami')) {
        return 'MIA';
    }
    if (team.includes('Milwaukee')) {
        return 'MIL';
    }
    if (team.includes('Minnesota')) {
        return 'MIN';
    }
    if (team.includes('New Orleans')) {
        console.log("new orleans " + game_year + " " + game_month);

         // pelicans (2013-2014 - present)
        if (game_year >= 2013) {
            if (game_year > 2013 || game_month > 7) {
                return 'NOP';
            }
        }

        // okc hornets
        if (game_month > 7 && (game_year == 2005 || game_year == 2006)) {
            return 'NOK';
        }
        if (game_month < 7 && (game_year == 2006 || game_year == 2007)) {
            return 'NOK';
        }

        // hornets
        return 'NOH';
    }
    if (team.includes('New Jersey')) {
        return 'NJN';
    }
    if (team.includes('New York')) {
        return 'NYK';
    }
    if (team.includes('Oklahoma City')) {
        return 'OKC';
    }
    if (team.includes('Orlando')) {
        return 'ORL';
    }
    if (team.includes('Philadelphia')) {
        return 'PHI';
    }
    if (team.includes('Phoenix')) {
        return 'PHO';
    }
    if (team.includes('Portland')) {
        return 'POR';
    }
    if (team.includes('Sacramento')) {
        return 'SAC';
    }
    if (team.includes('San Antonio')) {
        return 'SAS';
    }
    if (team.includes('Seattle')) {
        return 'SEA';
    }
    if (team.includes('Toronto')) {
        return 'TOR';
    }
    if (team.includes('Utah')) {
        return 'UTA';
    }
    if (team.includes('Washington')) {
        return 'WAS';
    }
}

function fetchSeasonSummary(team_tla, season_start_year) {

    function parseWithRegex(input, regex) {
        const match = input.match(regex)[0];
        return parseFloat(match.substring(match.indexOf('>') + 1));
    }

    return new Promise((resolve, reject) => {
        httpGet(`https://www.basketball-reference.com/teams/${team_tla}/${season_start_year+1}.html`)
        .then(response => {
            const offRating = parseWithRegex(response.data, /off_rtg\" \>([\.\d+]+)?/);
            const defRating = parseWithRegex(response.data, /def_rtg\" \>([\.\d+]+)?/);
            const pace = parseWithRegex(response.data, /pace\" \>([\.\d+]+)?/);

            resolve({
                offRating: offRating,
                defRating: defRating,
                pace: pace
            });
        })
        .catch(error => {
            reject(error);
        });
    });
}

function fetchAdvancedStats(home_team, game_date) {
    const date = game_date.split('-');

    const dateString = `${date[0]}${getPaddedNumber(date[1])}${getPaddedNumber(date[2])}`;
    const homeTLA = getTeamTLA(home_team, parseInt(date[0]), parseInt(date[1]));

    return new Promise((resolve, reject) => {
        httpGet(`https://www.basketball-reference.com/boxscores/${dateString}0${homeTLA}.html`)
        .then(response => {
            const paceRegex = /pace\" \>([\.\d+]+)?/; // matches one or more digits, optionally followed by a dot and one or more digits
            const paceMatch = response.data.match(paceRegex)[0];
            const pace = parseFloat(paceMatch.substring(paceMatch.indexOf('>') + 1));

            resolve(pace);
        })
        .catch(error => {
            reject(error);
        });
    });
}

function fetchBoxScoresForDateInternal(date) {
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
        numPossessions: box_score.numPossessions,
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

function readLines(file_path) {
    const boxScores = [];
    const lines = fs.readFileSync(file_path, 'utf-8').split('\n');
    lines.pop();

    lines.forEach(line => {
        boxScores.push(JSON.parse(line));
    });

    return boxScores;
}

function writeToFile(file_path, box_scores) {
    fs.writeFileSync(file_path, getFileString(box_scores));
}

function updateBoxScore(file_path, index, box_score_transformation) {
    const updatedBoxScores = readLines(file_path);
    updatedBoxScores[index] = box_score_transformation(updatedBoxScores[index]);

    writeToFile(file_path, updatedBoxScores);
}

function sortFileByGameDate(file_path) {
    const sortedBoxScores = readLines(file_path);

    sortedBoxScores.sort((a, b) => {
        return new Date(a.gameDate).getTime() - new Date(b.gameDate).getTime();
    });

    writeToFile(file_path, sortedBoxScores);
}


function appendCompactBoxScores(box_scores, file_path) {
    fs.appendFileSync(file_path, getFileString(box_scores));
}

function getSeasonSummariesHelper(box_scores) {
    const seasonSummaryByTeam = {};
    function getOrCreateTeamSummary(teamName) {
        let teamSummary = seasonSummaryByTeam[teamName];
        if (!teamSummary) {
            teamSummary = {
                teamName: teamName,
                totalGames: 0,
                totalPointsScored: 0,
                totalPointsAgainst: 0,
                totalPossessions: 0,
            };
        }
        seasonSummaryByTeam[teamName] = teamSummary;
        return teamSummary;
    }

    box_scores.forEach(box_score => {
        const roadTeamSummary = getOrCreateTeamSummary(box_score.roadTeam);
        const homeTeamSummary = getOrCreateTeamSummary(box_score.homeTeam);

        ++roadTeamSummary.totalGames;
        roadTeamSummary.totalPointsScored += box_score.roadTeamTotal;
        roadTeamSummary.totalPointsAgainst += box_score.homeTeamTotal;

        ++homeTeamSummary.totalGames;
        homeTeamSummary.totalPointsScored += box_score.homeTeamTotal;
        homeTeamSummary.totalPointsAgainst += box_score.roadTeamTotal;
    });

    const seasonSummaries = [];
    Object.keys(seasonSummaryByTeam).forEach(key => {
        const summary = seasonSummaryByTeam[key];
        seasonSummaries.push(summary);
    });

    return seasonSummaries;
}

function sortAndRank(data, field) {
    data.sort((a, b) => {
        return b[field] - a[field];
    });
    data.forEach((d, index) => {
        d[`${field}Rank`] = index + 1;
    });
}

function getSeasonSummaries(season_start_year) {
    const filePath = `data/season_averages/${season_start_year}_${season_start_year+1}.txt`;
    const seasonAverages = readLines(filePath);

    const seasonSummaries = getSeasonSummariesHelper(getSeasonScores(season_start_year));
    seasonSummaries.forEach(summary => {
        summary.pointsScoredPerGame = summary.totalPointsScored / summary.totalGames;
        summary.pointsAgainstPerGame = summary.totalPointsAgainst / summary.totalGames;

        seasonAverages.forEach(sa => {
            if (sa.teamName === summary.teamName) {
                summary.offensiveEfficiency = sa.offensiveEfficiency;
                summary.defensiveEfficiency = sa.defensiveEfficiency;
                summary.pace = sa.pace;
            }
        });
    });

    sortAndRank(seasonSummaries, 'offensiveEfficiency');
    sortAndRank(seasonSummaries, 'defensiveEfficiency');
    sortAndRank(seasonSummaries, 'pace');
    sortAndRank(seasonSummaries, 'pointsScoredPerGame');
    sortAndRank(seasonSummaries, 'pointsAgainstPerGame');

    return seasonSummaries;
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

function fetchBoxScoresForDatesHelper(current_game_date, num_additional_days, daily_scores, resolve, reject, file_path, box_score_transformation) {
    fetchBoxScoresForDateInternal(current_game_date)
    .then(boxScores => {
        console.log(`Fetched ${boxScores.length} games played on ${current_game_date.month}-${current_game_date.day}, ${num_additional_days} days left to query (${num_additional_days/20} mins)`);

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
            doAfterSeconds(3, () => {
                fetchBoxScoresForDatesHelper(prev_game_date, num_additional_days - 1, daily_scores, resolve, reject, file_path, box_score_transformation);
            });
        }
    })
    .catch(error => {
        reject(error);
    });
}

function fetchBoxScoresForDates(last_game_date, num_additional_days, file_path, box_score_transformation) {
    return new Promise((resolve, reject) => {
        fetchBoxScoresForDatesHelper(last_game_date, num_additional_days, [], resolve, reject, file_path, box_score_transformation);
    });
}

function fetchBoxScores(date) {
    return fetchBoxScoresForDates(date, 0);
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
    const boxScores = readLines(filePath);

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

// the goods in local files
bref.getSeasonSummaries = getSeasonSummaries;
bref.getSeasonScores = getSeasonScores;
bref.getSeasonScoresSimple = getSeasonScoresSimple;
bref.getTeamTLA = getTeamTLA;

// network request
bref.fetchBoxScores = fetchBoxScores;
bref.fetchBoxScoresForDates = fetchBoxScoresForDates;
bref.fetchSeasonSummary = fetchSeasonSummary;
bref.fetchAdvancedStats = fetchAdvancedStats;

// local file ops
bref.appendCompactBoxScores = appendCompactBoxScores;
bref.sortFileByGameDate = sortFileByGameDate;
bref.updateBoxScore = updateBoxScore;

module.exports = bref // npm link, npm link @sahirb/basketball-reference
