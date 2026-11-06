(function () {
    var RACE_ICONS = {
        T: '../images/terran-white.png',
        Z: '../images/zerg-white.png',
        P: '../images/protoss-white.png',
        R: '../images/random-white.png',
    };

    var DRAFT_STORAGE_KEY = 'hps-ch-draft-picks';

    function esc(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function raceIcon(race) {
        return RACE_ICONS[race] || RACE_ICONS.R;
    }

    // ─── Tabs ────────────────────────────────────────────────
    var tabButtons = document.querySelectorAll('[data-tab]');
    var panels = document.querySelectorAll('[data-panel]');

    function showTab(key) {
        tabButtons.forEach(function (btn) {
            btn.classList.toggle('tab-active', btn.getAttribute('data-tab') === key);
        });
        panels.forEach(function (panel) {
            panel.style.display = panel.getAttribute('data-panel') === key ? '' : 'none';
        });
    }

    tabButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
            showTab(btn.getAttribute('data-tab'));
        });
    });

    showTab('teams');

    // ─── Data ────────────────────────────────────────────────
    fetch('../data/champions-hungary.json')
        .then(function (res) {
            return res.json();
        })
        .then(render)
        .catch(function (err) {
            console.error('Failed to load HPS CH data', err);
        });

    function render(data) {
        var playerMap = {};
        data.playerPool.forEach(function (p) {
            playerMap[p.name] = p;
        });

        function playerRace(name) {
            return playerMap[name] ? playerMap[name].race : null;
        }

        var picks = loadPicks(data);

        function renderDraftAndTeams() {
            renderTeams(data, picks, playerRace);
            renderDraft(data, picks, playerRace);
        }

        document.getElementById('player-pool').addEventListener('click', function (e) {
            var btn = e.target.closest('[data-pick]');
            if (!btn || picks.length >= data.draft.order.length) return;
            picks.push(btn.getAttribute('data-pick'));
            savePicks(picks);
            renderDraftAndTeams();
        });

        document.getElementById('draft-undo').addEventListener('click', function () {
            if (!picks.length) return;
            picks.pop();
            savePicks(picks);
            renderDraftAndTeams();
        });

        document.getElementById('draft-reset').addEventListener('click', function () {
            if (!picks.length || !window.confirm('Reset the draft?')) return;
            picks.length = 0;
            savePicks(picks);
            renderDraftAndTeams();
        });

        renderStandings(data);
        renderDraftAndTeams();
        renderWeekMatches('week1-matches', data.weeks['1'], playerRace);
        renderWeekScore('w1', data.weeks['1'], data.teams);
        renderWeekMatches('week2-matches', data.weeks['2'], playerRace);
        renderWeekScore('w2', data.weeks['2'], data.teams);
        renderAllKill(data, playerRace);
    }

    // ─── Draft State ────────────────────────────────────────
    function loadPicks(data) {
        try {
            var stored = JSON.parse(window.localStorage.getItem(DRAFT_STORAGE_KEY));
            if (Array.isArray(stored) && stored.length <= data.draft.order.length) {
                var valid = {};
                data.playerPool.forEach(function (p) {
                    if (!p.captain) valid[p.name] = true;
                });
                var seen = {};
                var ok = stored.every(function (name) {
                    if (typeof name !== 'string' || !valid[name] || seen[name]) return false;
                    seen[name] = true;
                    return true;
                });
                if (ok) return stored;
            }
        } catch (e) {}
        return data.draft.picks.slice();
    }

    function savePicks(picks) {
        try {
            window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(picks));
        } catch (e) {}
    }

    // ─── Standings ──────────────────────────────────────────
    function renderStandings(data) {
        document.getElementById('team-a-name').textContent = data.teams.A.name;
        document.getElementById('team-b-name').textContent = data.teams.B.name;
        document.getElementById('team-a-pts').textContent = data.standings.A;
        document.getElementById('team-b-pts').textContent = data.standings.B;
    }

    // ─── Teams ──────────────────────────────────────────────
    function playerRow(name, race) {
        var icon = race
            ? '<img src="' + raceIcon(race) + '" class="h-5 w-5 object-contain" alt="">'
            : '<span class="inline-block h-5 w-5 rounded-full bg-gray-700"></span>';
        return '<div class="flex items-center gap-2 py-1">' +
            icon +
            '<span class="text-sm text-gray-200">' + esc(name) + '</span>' +
        '</div>';
    }

    function renderTeams(data, picks, playerRace) {
        var order = data.draft.order;

        ['A', 'B'].forEach(function (key) {
            var team = data.teams[key];
            var html = playerRow(team.captain, playerRace(team.captain)) +
                '<span class="text-[10px] uppercase tracking-wider text-purple-400 font-bold">Captain</span>';

            var players = picks.filter(function (name, i) {
                return order[i] === key;
            });
            players.forEach(function (name) {
                html += playerRow(name, playerRace(name));
            });
            for (var i = players.length; i < 6; i++) {
                html += playerRow('TBD', null);
            }

            document.getElementById('roster-' + key.toLowerCase()).innerHTML = html;
        });
    }

    // ─── Draft ──────────────────────────────────────────────
    function renderDraft(data, picks, playerRace) {
        var order = data.draft.order;

        var html = '';
        for (var i = 0; i < order.length; i++) {
            var team = order[i];
            var teamName = data.teams[team].name;
            var picked = picks[i] || null;
            var bgClass = team === 'A' ? 'bg-purple-500/10' : 'bg-blue-500/10';
            var textClass = team === 'A' ? 'text-purple-300' : 'text-blue-300';

            html += '<div class="flex items-center gap-3 rounded-lg p-2 ' + bgClass + '">' +
                '<span class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-500/20 text-xs font-bold text-gray-300">' + (i + 1) + '</span>' +
                '<span class="text-xs font-bold uppercase tracking-wider ' + textClass + '">' + esc(teamName) + '</span>' +
                '<span class="ml-auto italic-header text-sm">';

            if (picked) {
                var race = playerRace(picked);
                if (race) {
                    html += '<img src="' + raceIcon(race) + '" class="inline h-4 w-4 object-contain mr-1" alt="">';
                }
                html += esc(picked);
            } else if (i === picks.length) {
                html += '<span class="text-white">On the clock...</span>';
            } else {
                html += '<span class="text-gray-500">Awaiting pick...</span>';
            }

            html += '</span></div>';
        }

        document.getElementById('draft-picks').innerHTML = html;

        // Available player pool
        var drafted = {};
        picks.forEach(function (name) { drafted[name] = true; });
        drafted[data.teams.A.captain] = true;
        drafted[data.teams.B.captain] = true;

        var available = data.playerPool
            .filter(function (p) { return !drafted[p.name]; })
            .sort(function (a, b) { return (b.mmr || 0) - (a.mmr || 0); });

        var poolHtml = '';
        available.forEach(function (p) {
            var icon = p.race
                ? '<img src="' + raceIcon(p.race) + '" class="h-4 w-4 object-contain" alt="">'
                : '<span class="inline-block h-4 w-4 rounded-full bg-gray-700"></span>';
            poolHtml += '<button type="button" data-pick="' + esc(p.name) + '" class="flex items-center gap-2 rounded-lg bg-gray-800/40 p-2 text-left transition hover:bg-purple-500/20">' +
                icon +
                '<span class="text-sm text-gray-200">' + esc(p.name) + '</span>' +
                '<span class="ml-auto text-xs font-bold text-white">' + esc(p.mmr || '') + '</span>' +
            '</button>';
        });

        if (!poolHtml) {
            poolHtml = '<p class="text-sm text-gray-500 col-span-full text-center">All players have been drafted!</p>';
        }

        document.getElementById('player-pool').innerHTML = poolHtml;

        document.getElementById('draft-undo').disabled = picks.length === 0;
        document.getElementById('draft-reset').disabled = picks.length === 0;
    }

    // ─── Week Matches ───────────────────────────────────────
    function renderWeekMatches(targetId, week, playerRace) {
        var html = '';
        (week.matches || []).forEach(function (match) {
            var p1 = match.p1 || 'TBD';
            var p2 = match.p2 || 'TBD';
            var r1 = playerRace(p1);
            var r2 = playerRace(p2);

            var score = (match.s1 != null && match.s2 != null)
                ? '<span class="italic-header text-lg md:text-xl">' + match.s1 + ' <span class="text-purple-400">-</span> ' + match.s2 + '</span>'
                : '<span class="text-xs text-gray-500">vs</span>';

            var icon1 = r1
                ? '<img src="' + raceIcon(r1) + '" class="h-5 w-5 flex-shrink-0 object-contain" alt="">'
                : '<span class="inline-block h-5 w-5 flex-shrink-0 rounded-full bg-gray-700"></span>';
            var icon2 = r2
                ? '<img src="' + raceIcon(r2) + '" class="h-5 w-5 flex-shrink-0 object-contain" alt="">'
                : '<span class="inline-block h-5 w-5 flex-shrink-0 rounded-full bg-gray-700"></span>';

            html +=
                '<div class="match-card flex items-center justify-between p-3 md:p-4">' +
                    '<div class="flex min-w-0 flex-1 items-center gap-2">' +
                        icon1 +
                        '<span class="italic-header truncate text-sm md:text-base text-gray-200">' + esc(p1) + '</span>' +
                    '</div>' +
                    '<div class="mx-2 flex-shrink-0 text-center md:mx-6">' + score + '</div>' +
                    '<div class="flex min-w-0 flex-1 items-center justify-end gap-2">' +
                        '<span class="italic-header truncate text-sm md:text-base text-gray-200">' + esc(p2) + '</span>' +
                        icon2 +
                    '</div>' +
                '</div>';
        });

        document.getElementById(targetId).innerHTML = html;
    }

    function renderWeekScore(prefix, week, teams) {
        document.getElementById(prefix + '-team-a').textContent = teams.A.name;
        document.getElementById(prefix + '-team-b').textContent = teams.B.name;

        if (!week.revealed || !week.matches) return;

        var scoreA = 0;
        var scoreB = 0;
        week.matches.forEach(function (m) {
            if (m.s1 == null || m.s2 == null) return;
            if (m.s1 >= 1) scoreA++;
            if (m.s2 >= 1) scoreB++;
        });

        document.getElementById(prefix + '-score-a').textContent = scoreA;
        document.getElementById(prefix + '-score-b').textContent = scoreB;
    }

    // ─── All-Kill ───────────────────────────────────────────
    function renderAllKill(data, playerRace) {
        var week3 = data.weeks['3'];

        document.getElementById('ak-team-a').textContent = data.teams.A.name;
        document.getElementById('ak-team-b').textContent = data.teams.B.name;

        // Lineups
        var lineupAHtml = '';
        if (week3.lineupA && week3.lineupA.length > 0) {
            week3.lineupA.forEach(function (name) {
                lineupAHtml += playerRow(name, playerRace(name));
            });
        } else {
            for (var a = 0; a < 4; a++) {
                lineupAHtml += playerRow('TBD', null);
            }
        }
        document.getElementById('allkill-lineup-a').innerHTML = lineupAHtml;

        var lineupBHtml = '';
        if (week3.lineupB && week3.lineupB.length > 0) {
            week3.lineupB.forEach(function (name) {
                lineupBHtml += playerRow(name, playerRace(name));
            });
        } else {
            for (var b = 0; b < 4; b++) {
                lineupBHtml += playerRow('TBD', null);
            }
        }
        document.getElementById('allkill-lineup-b').innerHTML = lineupBHtml;

        // Games
        var gamesHtml = '';
        var games = week3.games && week3.games.length > 0 ? week3.games : [];
        if (!games.length) {
            for (var g = 0; g < 7; g++) games.push({ p1: null, p2: null });
        }
        games.forEach(function (game, idx) {
                var p1 = game.p1 || 'TBD';
                var p2 = game.p2 || 'TBD';
                var r1 = playerRace(p1);
                var r2 = playerRace(p2);
                var winner = null;
                if (game.winner) winner = game.winner;

                var icon1 = r1
                    ? '<img src="' + raceIcon(r1) + '" class="h-5 w-5 flex-shrink-0 object-contain" alt="">'
                    : '<span class="inline-block h-5 w-5 flex-shrink-0 rounded-full bg-gray-700"></span>';
                var icon2 = r2
                    ? '<img src="' + raceIcon(r2) + '" class="h-5 w-5 flex-shrink-0 object-contain" alt="">'
                    : '<span class="inline-block h-5 w-5 flex-shrink-0 rounded-full bg-gray-700"></span>';

                var p1Class = winner === p1 ? 'text-white font-bold' : (winner === p2 ? 'text-gray-500' : 'text-gray-200');
                var p2Class = winner === p2 ? 'text-white font-bold' : (winner === p1 ? 'text-gray-500' : 'text-gray-200');

                gamesHtml +=
                    '<div class="flex items-center justify-between rounded-lg bg-gray-800/40 p-3">' +
                        '<span class="text-xs font-bold text-purple-400 mr-3">G' + (idx + 1) + '</span>' +
                        '<div class="flex min-w-0 flex-1 items-center gap-2">' +
                            icon1 +
                            '<span class="italic-header truncate text-sm ' + p1Class + '">' + esc(p1) + '</span>' +
                        '</div>' +
                        '<div class="mx-2 flex-shrink-0 text-center">' +
                            (winner
                                ? '<span class="text-xs text-green-400 font-bold uppercase">W: ' + esc(winner) + '</span>'
                                : '<span class="text-xs text-gray-500">vs</span>') +
                        '</div>' +
                        '<div class="flex min-w-0 flex-1 items-center justify-end gap-2">' +
                            '<span class="italic-header truncate text-sm ' + p2Class + '">' + esc(p2) + '</span>' +
                            icon2 +
                        '</div>' +
                    '</div>';
        });
        document.getElementById('allkill-games').innerHTML = gamesHtml;

        // All-Kill score
        if (week3.games && week3.games.length > 0) {
            var mapA = 0;
            var mapB = 0;
            var lineupANames = {};
            var lineupBNames = {};
            if (week3.lineupA) week3.lineupA.forEach(function (n) { lineupANames[n] = true; });
            if (week3.lineupB) week3.lineupB.forEach(function (n) { lineupBNames[n] = true; });

            week3.games.forEach(function (game) {
                if (!game.winner) return;
                if (lineupANames[game.winner]) mapA++;
                else if (lineupBNames[game.winner]) mapB++;
            });

            // Check if series is complete (one team eliminated all 4)
            var eliminatedA = 0;
            var eliminatedB = 0;
            var eliminated = {};
            week3.games.forEach(function (game) {
                if (!game.winner) return;
                var loser = game.winner === game.p1 ? game.p2 : game.p1;
                eliminated[loser] = true;
            });
            week3.lineupA.forEach(function (n) { if (eliminated[n]) eliminatedA++; });
            week3.lineupB.forEach(function (n) { if (eliminated[n]) eliminatedB++; });

            if (eliminatedB >= 4) mapA += 5; // Team A wins, +5 bonus
            if (eliminatedA >= 4) mapB += 5; // Team B wins, +5 bonus

            document.getElementById('ak-score-a').textContent = mapA;
            document.getElementById('ak-score-b').textContent = mapB;
        }
    }
})();
