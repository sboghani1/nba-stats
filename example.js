const fs = require('fs');
const bref = require('@sahirb/nba-stats')

/*
    This is an example for
        1. Getting 3 days worth of NBA scores as JSON
        2. Saving that JSON as a text file
        3. Transforming the data to add a "feeling" property
            a. 'snooze fest'
            b. 'wow points and stuff in a blow out' if more than 220 points were scored (but score difference was greater than 10)
            c. 'be still my heart <4' if more than 220 points were scored & the score difference was less than 10
*/

const nba_season_end = {
    year: 2019,
    month: 10,
    day: 26
};
const num_additional_days = 4;

const backfillSeasons = [
    {
        start: {
            year: 2003,
            month: 10,
            day: 28
        },
        end: {
            year: 2004,
            month: 4,
            day: 14
        }
    },
    // {
    //     start: {
    //         year: 2018,
    //         month: 10,
    //         day: 16
    //     },
    //     end: {
    //         year: 2019,
    //         month: 4,
    //         day: 10
    //     }
    // },
    // {
    //     start: {
    //         year: 2018,
    //         month: 10,
    //         day: 16
    //     },
    //     end: {
    //         year: 2019,
    //         month: 4,
    //         day: 10
    //     }
    // },
    // {
    //     start: {
    //         year: 2018,
    //         month: 10,
    //         day: 16
    //     },
    //     end: {
    //         year: 2019,
    //         month: 4,
    //         day: 10
    //     }
    // }
]

// const sortedLakers = bref.getSeasonScores(2022)
// .filter(boxScore => {
//     return boxScore.roadTeam === 'LA Lakers' && boxScore.winningTeam !== 'LA Lakers';
// }).sort((boxScoreA, boxScoreB) => {
//     return boxScoreA.roadTeamTotal - boxScoreB.roadTeamTotal;
// }).map(boxScore => {
//     return {
//         date: boxScore.gameDate,
//         total: boxScore.roadTeamTotal,
//         diff: boxScore.roadTeamTotal - boxScore.homeTeamTotal,
//         numPossessions: boxScore.numPossessions,
//         q2Diff: boxScore.periodBreakdown[1].roadTotal - boxScore.periodBreakdown[1].homeTotal,
//     }
// });

// console.log(sortedLakers);

// const years = [2022, 2021, 2020, 2019, 2018];
// years.forEach(year => {
//     const top5Off = bref.getEfficiencyDataByTeam(year)
//     .filter(summary => {
//         return summary.offEfficiencyRank <= 5;
//     })
//     .map(summary => {
//         return {
//             teamName: summary.teamName,
//             offRank: summary.offEfficiencyRank,
//             off: summary.offEfficiency,
//             points: summary.totalPointsScored,
//             averagePace: summary.averagePace
//         };
//     })
//     .sort((a, b) => {
//         return a.offRank - b.offRank;
//     });
//     console.log(year);
//     console.log(top5Off);
// });

const teams = ['Atlanta', 'Boston', 'Brooklyn', 'Charlotte', 'Chicago', 'Cleveland', 'Dallas', 'Denver', 'Detroit', 'Golden State', 'Houston',
'Indiana', 'LA Clippers', 'LA Lakers', 'Memphis', 'Miami', 'Milwaukee', 'Minnesota', 'New Orleans', 'New Jersey', 'New York', 'Oklahoma City', 'Orlando', 'Philadelphia', 'Phoenix', 'Portland',
'Sacramento', 'San Antonio', 'Seattle', 'Toronto', 'Utah', 'Washington'];
// const teams = ['New Orleans']

let doubleError = false;
let seasonTeamCount = 0;

function workEff(seasonStart, teamsIndex) {
    doubleError = false;

    if (teamsIndex >= teams.length) {
        if (seasonTeamCount !== 30) {
            console.log('not enough teams for this season!!!');
            return;
        }

        seasonTeamCount = 0;
        console.log('new season ' + (seasonStart-1));
        workEff(seasonStart - 1, 0);
        return;
    }

    const team = teams[teamsIndex];
    const teamTLA = bref.getTeamTLA(team, seasonStart, 12);

    // console.log(` fetchSeasonSummary ${team} ${seasonStart} ${teamsIndex}`);
    bref.fetchSeasonSummary(teamTLA, seasonStart).then(result => {
        ++seasonTeamCount;
        // console.log(result);

        // let boxScores = bref.getSeasonScores(seasonStart);

        const filePath = `./data/season_averages/${seasonStart}_${seasonStart+1}.txt`;

        fs.appendFileSync(filePath, JSON.stringify({
            teamName: team,
            teamTLA: teamTLA,
            offensiveEfficiency: result.offRating,
            defensiveEfficiency: result.defRating,
            pace: result.pace,
        }) + '\n');

        // console.log(`${team} ${seasonStart} next team in 3s ${result.pace}`);
        setTimeout(() => {
            workEff(seasonStart, teamsIndex + 1);
        }, 3000);

        // boxScores.forEach((boxScore, index) => {
        //     if (boxScore.roadTeam === team) {

        //         bref.updateBoxScore(filePath, index, (boxScoreLine) => {
        //             boxScoreLine.roadTeamSeasonOffEff = result.offRating;
        //         });
        //     }
        // });

        // bref.updateBoxScore(filePath, index, (boxScoreLine) => {
            // ++numInsignificant;
            // boxScoreLine.numPossessions = pace;

            // if (boxScoreLine.periodBreakdown[0].roadTotal > max || boxScoreLine.periodBreakdown[0].roadTotal < min) {
            //     console.log(numInsignificant + ' later q1 ----- ' + min + '-' + max);
            //     numInsignificant = 0;

            //     if (boxScoreLine.periodBreakdown[0].roadTotal > max) {
            //         max = boxScoreLine.periodBreakdown[0].roadTotal;
            //     }
            //     if (boxScoreLine.periodBreakdown[0].roadTotal < min) {
            //         min = boxScoreLine.periodBreakdown[0].roadTotal;
            //     }

            //     console.log('new q1 --------- ' + min + '-' + max);
            // }

        //     return boxScoreLine;
        // });
    }).catch(error => {
        // console.log(error);

        if (!doubleError) {
            doubleError = true;
            workEff(seasonStart, teamsIndex + 1);
        }
    });
}

// workEff(2012, 0);

[2022, 2021, 2020, 2019, 2018].forEach(year => {

    const sortedTop3 = bref.getSeasonSummaries(year)
    .filter(summary => {
        return summary.offensiveEfficiencyRank <= 3;
    }).map(summary => {
        return {
            teamName: summary.teamName,
            offensiveEfficiencyRank: summary.offensiveEfficiencyRank,
            pointsRank: summary.pointsScoredPerGameRank,
            offensiveEfficiency: summary.offensiveEfficiency,
            points: summary.pointsScoredPerGame,
            pace: summary.pace
        }
    }).sort((a, b) => {
        return a.offRank - b.offRank;
    });

    console.log('--------------------------------------------------------------------');
    console.log(year);
    console.log(sortedTop3);
});

// const summaries = bref.getSeasonSummaries(2022).sort((a, b) => {
//     return a.offensiveEfficiencyRank - b.offensiveEfficiencyRank;
// });
// console.log(summaries);

const local_file_path_tempalte = "./data/box_scores/";
// bref.sortFileByGameDate(local_file_path);

const len = backfillSeasons.length;

function backfill(index) {
    if (index >= len) {
        return;
    }

    const backfillSeason = backfillSeasons[index];
    const local_file_path_season = local_file_path_tempalte + `${backfillSeason.start.year}_${backfillSeason.end.year}.txt`;

    const start = new Date(backfillSeason.start.year, backfillSeason.start.month - 1, backfillSeason.start.day);
    const end = new Date(backfillSeason.end.year, backfillSeason.end.month - 1, backfillSeason.end.day + 1);

    const num_additional_days_to_fetch = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    console.log(`Fetching ${num_additional_days_to_fetch} days from ${start.toLocaleString()} to ${end.toDateString()}`);

    bref.fetchBoxScoresForDates(backfillSeason.end, num_additional_days_to_fetch, null, null)
    .then(boxScores => {
        boxScores.sort((a, b) => {
            return new Date(a.gameDate).getTime() - new Date(b.gameDate).getTime();
        });

        bref.appendCompactBoxScores(boxScores, local_file_path_season);
        bref.sortFileByGameDate(local_file_path_season);
        backfill(index + 1);
    });
}
// backfill(0);

const season = {
    seasonStart: 2009,
    seasonEnd: 2010
}

let seasonStart = 2015;
let boxScores = bref.getSeasonScores(seasonStart);
let limit = boxScores.length;

let min = 500;
let max = 1;
let numInsignificant = 0;

function work(index) {
    if (index >= limit) {
        console.log('done, time for ' + (seasonStart-1));

        if (seasonStart <= 2008) {
            return;
        }

        seasonStart--;
        boxScores = bref.getSeasonScores(seasonStart);
        limit = boxScores.length;
        max = 500;
        max = 1;
        numInsignificant = 0;
        console.log('working on ' + seasonStart + ' with ' + limit + ' games');
        work(0);
        return;
    }

    const boxScore = boxScores[index];
    // console.log('working on ' + index);
    // console.log(boxScore)
    const filePath = `./data/box_scores/${seasonStart}_${seasonStart+1}.txt`;

    if (!boxScore.numPossessions) {
        bref.fetchAdvancedStats(boxScore.homeTeam, boxScore.gameDate)
        .then(pace => {
            console.log('got pace ' + pace);

            bref.updateBoxScore(filePath, index, (boxScoreLine) => {
                ++numInsignificant;
                boxScoreLine.numPossessions = pace;

                if (boxScoreLine.periodBreakdown[0].roadTotal > max || boxScoreLine.periodBreakdown[0].roadTotal < min) {
                    console.log(numInsignificant + ' later q1 ----- ' + min + '-' + max);
                    numInsignificant = 0;

                    if (boxScoreLine.periodBreakdown[0].roadTotal > max) {
                        max = boxScoreLine.periodBreakdown[0].roadTotal;
                    }
                    if (boxScoreLine.periodBreakdown[0].roadTotal < min) {
                        min = boxScoreLine.periodBreakdown[0].roadTotal;
                    }

                    console.log('new q1 --------- ' + min + '-' + max);
                }

                return boxScoreLine;
            });

            const originalLen = 3*limit/60;

            console.log('going to work again after 3s - ' + (limit - index) + ' remaining aka ' + (3*(limit-index)/60) + ' minutos remaining, original ' + originalLen);
            setTimeout(() => {
                work(index+1);
            }, 3000);
        });
    } else {
        // console.log('skiping ' + index + ' already have ' + boxScore.numPossessions);
        work(index+1);
    }
}

// work(0);

// const teamNames = new Map();
// const sortedTeamNames = [];

// boxScores.forEach(boxScore => {
//     if (!teamNames.has(boxScore.homeTeam)) {
//         teamNames.set(boxScore.homeTeam, true);
//     }
// });
// teamNames.forEach((value, key) => {
//     sortedTeamNames.push(key);
// });
// sortedTeamNames.sort();
// sortedTeamNames.forEach(teamName => {
//     console.log(teamName);
// });

// bref.getBoxScoresForDates(nba_season_end, num_additional_days, '', null).then(boxScores => {
//     boxScores.sort((a, b) => {
//         return new Date(a.gameDate).getTime() - new Date(b.gameDate).getTime();
//     });

//     bref.appendCompactBoxScores(boxScores, local_file_path);
//     bref.sortFileByGameDate(local_file_path);
// });

// const lakersThunder = bref.getSeasonScoresSimple(2022, ['LA Lakers', 'Oklahoma City']);
// console.log(lakersThunder.length);
// console.log(lakersThunder[0]);

// const sortedLakers = bref.getSeasonScores(2022)
// .filter(boxScore => {
//     return boxScore.roadTeam === 'LA Lakers' && boxScore.winningTeam !== 'LA Lakers';
// }).sort((boxScoreA, boxScoreB) => {
//     return boxScoreA.roadTeamTotal - boxScoreB.roadTeamTotal;
// }).map(boxScore => {
//     return {
//         date: boxScore.gameDate,
//         total: boxScore.roadTeamTotal,
//         diff: boxScore.roadTeamTotal - boxScore.homeTeamTotal,
//         q2Diff: boxScore.periodBreakdown[1].roadTotal - boxScore.periodBreakdown[1].homeTotal,
//     }
// });

// console.log(sortedLakers);
