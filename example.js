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
            year: 2011,
            month: 12,
            day: 25
        },
        end: {
            year: 2012,
            month: 4,
            day: 26
        }
    },
    {
        start: {
            year: 2010,
            month: 10,
            day: 26
        },
        end: {
            year: 2011,
            month: 4,
            day: 13
        }
    },
    {
        start: {
            year: 2009,
            month: 10,
            day: 27
        },
        end: {
            year: 2010,
            month: 4,
            day: 14
        }
    },
    {
        start: {
            year: 2008,
            month: 10,
            day: 28
        },
        end: {
            year: 2009,
            month: 4,
            day: 16
        }
    },
    {
        start: {
            year: 2007,
            month: 10,
            day: 30
        },
        end: {
            year: 2008,
            month: 4,
            day: 16
        }
    },
    {
        start: {
            year: 2006,
            month: 10,
            day: 31
        },
        end: {
            year: 2007,
            month: 4,
            day: 18
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

const sortedLakers = bref.getSeasonScores(2018)
.filter(boxScore => {
    return boxScore.roadTeam === 'LA Lakers' && boxScore.winningTeam !== 'LA Lakers';
}).sort((boxScoreA, boxScoreB) => {
    return boxScoreA.roadTeamTotal - boxScoreB.roadTeamTotal;
}).map(boxScore => {
    return {
        date: boxScore.gameDate,
        total: boxScore.roadTeamTotal,
        diff: boxScore.roadTeamTotal - boxScore.homeTeamTotal,
        q2Diff: boxScore.periodBreakdown[1].roadTotal - boxScore.periodBreakdown[1].homeTotal,
    }
});

console.log(sortedLakers);



const local_file_path_tempalte = "/Users/boghani/ns2/data/box_scores/";
const local_file_path = "/Users/boghani/basketball-reference-js-box-score/data/box_scores/2019_2020.txt";

const box_score_transformation = (boxScore) => {
    let feeling = 'snooze fest';

    if (boxScore.gameTotal > 220) {
        feeling = 'wow points and stuff';

        if (boxScore.winningTeamScore - boxScore.losingTeamScore < 10) {
            feeling = 'be still my heart <4';
        }
    }

    boxScore.feeling = feeling;
};

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

    bref.getBoxScoresForDates(backfillSeason.end, num_additional_days_to_fetch, null, null)
    .then(boxScores => {
        boxScores.sort((a, b) => {
            return new Date(a.gameDate).getTime() - new Date(b.gameDate).getTime();
        });

        bref.appendCompactBoxScores(boxScores, local_file_path_season);
        bref.sortFileByGameDate(local_file_path_season);
        backfill(index + 1);
    });
}

const season = {
    seasonStart: 2009,
    seasonEnd: 2010
}

const seasonStart = 2022;
const boxScores = bref.getSeasonScores(seasonStart);
const limit = 0; // boxScores.length

function work(index) {
    const boxScore = boxScores[index];
    const filePath = `/Users/boghani/nba-stats/data/box_scores/${seasonStart}_${seasonStart+1}.txt`;

    bref.getAdvancedStats(boxScore.homeTeam, boxScore.gameDate)
    .then(pace => {
        console.log('got pace ' + pace);

        bref.updateBoxScore(filePath, index, (boxScoreLine) => {
            boxScoreLine.numPossessions = pace;
            return boxScoreLine;
        })

        if (index < limit) {
            console.log('going to work again after 20s')
            setTimeout(() => {
                work(index+1);
            }, 20000);
        }
    });
}

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
