(function () {
    var RACE_ICONS = {
        T: '../images/terran-white.png',
        Z: '../images/zerg-white.png',
        P: '../images/protoss-white.png',
        R: '../images/random-white.png',
    };

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

    showTab('standings');

    // ─── Data ────────────────────────────────────────────────
    fetch('../data/bw-season-1.json')
        .then(function (res) {
            return res.json();
        })
        .then(render)
        .catch(function (err) {
            console.error('Failed to load BW Season 1 data', err);
        });

    function render(data) {
        var players = data.players;
        var playerMap = {};
        players.forEach(function (p) {
            playerMap[p.name] = p;
        });

        function playerRace(name) {
            return playerMap[name] ? playerMap[name].race : 'R';
        }

        renderStandings(computeStandings(players, data.fixtures));
        renderFixtures(data, playerRace);
        renderBracket('codeS-bracket', data.codeSBracket, 'S');
        renderBracket('codeA-bracket', data.codeABracket, 'A');
        renderTiers(players);
    }

    // ─── Standings ───────────────────────────────────────────
    function computeStandings(players, fixtures) {
        var stats = {};
        var order = {};
        players.forEach(function (p, i) {
            order[p.name] = i;
            stats[p.name] = { name: p.name, race: p.race, tier: p.tier, wins: 0, losses: 0, mapWins: 0, mapLosses: 0, mapDiff: 0 };
        });

        Object.keys(fixtures).forEach(function (round) {
            fixtures[round].forEach(function (m) {
                if (m.s1 == null || m.s2 == null) return;
                var a = stats[m.p1];
                var b = stats[m.p2];
                if (!a || !b) return;

                a.mapWins += m.s1;
                a.mapLosses += m.s2;
                b.mapWins += m.s2;
                b.mapLosses += m.s1;

                if (m.s1 > m.s2) { a.wins++; b.losses++; }
                else if (m.s2 > m.s1) { b.wins++; a.losses++; }
            });
        });

        var rows = Object.keys(stats).map(function (k) {
            var s = stats[k];
            s.mapDiff = s.mapWins - s.mapLosses;
            return s;
        });

        // Sort: wins desc, mapDiff desc, initial order asc (tiebreak)
        return rows.sort(function (a, b) {
            if (b.wins !== a.wins) return b.wins - a.wins;
            if (b.mapDiff !== a.mapDiff) return b.mapDiff - a.mapDiff;
            return (order[a.name] || 0) - (order[b.name] || 0);
        });
    }

    function standingRowClass(idx) {
        if (idx < 8) return 'bg-purple-500/5 hover:bg-purple-500/15';
        if (idx < 16) return 'bg-blue-500/5 hover:bg-blue-500/15';
        return 'bg-red-500/5 hover:bg-red-500/15';
    }

    function zoneLabel(idx) {
        if (idx < 8) return 'CODE S';
        if (idx < 16) return 'CODE A';
        return 'ELIM';
    }

    function zoneTextClass(idx) {
        if (idx < 8) return 'text-purple-400';
        if (idx < 16) return 'text-blue-400';
        return 'text-red-400';
    }

    function mapDiffClass(diff) {
        if (diff > 0) return 'text-green-400';
        if (diff < 0) return 'text-red-400';
        return 'text-gray-400';
    }

    function renderStandings(rows) {
        var html = rows.map(function (row, idx) {
            return (
                '<tr class="border-b border-purple-500/10 transition-colors ' + standingRowClass(idx) + '">' +
                    '<td class="p-2 md:px-4 md:py-3">' +
                        '<span class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-500/20 text-xs font-bold text-gray-300">' + (idx + 1) + '</span>' +
                    '</td>' +
                    '<td class="p-2 md:px-4 md:py-3">' +
                        '<div class="flex items-center gap-2">' +
                            '<img src="' + raceIcon(row.race) + '" class="h-5 w-5 object-contain" alt="' + esc(row.race) + '">' +
                            '<span class="italic-header text-sm md:text-base">' + esc(row.name) + '</span>' +
                        '</div>' +
                    '</td>' +
                    '<td class="italic-header p-2 text-center text-sm md:px-4 md:py-3">' + row.wins + '</td>' +
                    '<td class="italic-header p-2 text-center text-sm md:px-4 md:py-3">' + row.losses + '</td>' +
                    '<td class="italic-header p-2 text-center text-sm md:px-4 md:py-3">' +
                        '<span class="' + mapDiffClass(row.mapDiff) + '">' + (row.mapDiff > 0 ? '+' : '') + row.mapDiff + '</span>' +
                    '</td>' +
                    '<td class="p-2 text-right text-xs font-bold uppercase tracking-wider md:px-4 md:py-3">' +
                        '<span class="' + zoneTextClass(idx) + '">' + zoneLabel(idx) + '</span>' +
                    '</td>' +
                '</tr>'
            );
        }).join('');

        document.getElementById('standings-body').innerHTML = html;
    }

    // ─── Fixtures ────────────────────────────────────────────
    function renderFixtures(data, playerRace) {
        var html = '';
        for (var round = 1; round <= 6; round++) {
            html += '<div>' +
                '<h3 class="italic-header purple-gradient-text mb-1 text-xl">ROUND ' + round + '</h3>' +
                '<p class="mb-4 text-xs text-gray-500">' + esc(data.roundDates[round] || '') + '</p>';

            if (round <= data.revealedRounds) {
                html += '<div class="space-y-2">';
                (data.fixtures[round] || []).forEach(function (match) {
                    var score = (match.s1 != null && match.s2 != null)
                        ? '<span class="italic-header text-lg md:text-xl">' + match.s1 + ' <span class="text-purple-400">-</span> ' + match.s2 + '</span>'
                        : '<span class="text-xs text-gray-500">vs</span>';

                    html +=
                        '<div class="match-card flex items-center justify-between p-3 md:p-4">' +
                            '<div class="flex min-w-0 flex-1 items-center gap-2">' +
                                '<img src="' + raceIcon(playerRace(match.p1)) + '" class="h-5 w-5 flex-shrink-0 object-contain" alt="">' +
                                '<span class="italic-header truncate text-sm md:text-base text-gray-200">' + esc(match.p1) + '</span>' +
                            '</div>' +
                            '<div class="mx-2 flex-shrink-0 text-center md:mx-6">' + score + '</div>' +
                            '<div class="flex min-w-0 flex-1 items-center justify-end gap-2">' +
                                '<span class="italic-header truncate text-sm md:text-base text-gray-200">' + esc(match.p2) + '</span>' +
                                '<img src="' + raceIcon(playerRace(match.p2)) + '" class="h-5 w-5 flex-shrink-0 object-contain" alt="">' +
                            '</div>' +
                        '</div>';
                });
                html += '</div>';
            } else {
                html += '<div class="match-card p-6 text-center"><p class="text-sm text-gray-500">Matchups will be revealed later</p></div>';
            }

            html += '</div>';
        }

        document.getElementById('fixtures-list').innerHTML = html;
    }

    // ─── Brackets ────────────────────────────────────────────
    function bracketWinner(m) {
        if (m.s1 == null || m.s2 == null || !m.p1 || !m.p2) return null;
        if (m.s1 > m.s2) return m.p1;
        if (m.s2 > m.s1) return m.p2;
        return null;
    }

    function slot(m, side) {
        var name = side === 1 ? m.p1 : m.p2;
        var score = side === 1 ? m.s1 : m.s2;
        var winner = bracketWinner(m);
        var winClass = winner && winner === name ? ' bracket-winner' : '';
        return '<div class="bracket-slot' + winClass + '">' +
            '<span class="flex-1 truncate">' + esc(name || 'TBD') + '</span>' +
            (score != null ? '<span class="bracket-score">' + score + '</span>' : '') +
        '</div>';
    }

    function matchBox(m) {
        return '<div class="bracket-match">' + slot(m, 1) + slot(m, 2) + '</div>';
    }

    function renderBracket(targetId, bracket, code) {
        var labelClass = code === 'S'
            ? 'mb-3 text-center text-[10px] font-bold uppercase tracking-widest text-purple-400'
            : 'mb-3 text-center text-[10px] font-bold uppercase tracking-widest text-blue-400';
        var championLabelClass = code === 'S'
            ? 'text-xs uppercase tracking-wider text-purple-400'
            : 'text-xs uppercase tracking-wider text-blue-400';
        var championNameClass = code === 'S'
            ? 'italic-header purple-gradient-text text-2xl'
            : 'italic-header text-2xl text-blue-200';

        var champion = bracketWinner(bracket.gf);

        var html =
            '<div class="bracket-round">' +
                '<p class="' + labelClass + '">Quarter-Finals</p>' +
                '<div class="space-y-4">' + bracket.qf.map(matchBox).join('') + '</div>' +
            '</div>' +
            '<div class="bracket-round">' +
                '<p class="' + labelClass + '">Semi-Finals</p>' +
                '<div class="flex flex-col justify-around space-y-4" style="min-height: 100%;">' + bracket.sf.map(matchBox).join('') + '</div>' +
            '</div>' +
            '<div class="bracket-round">' +
                '<p class="' + labelClass + '">Grand Finals</p>' +
                '<div class="flex flex-col justify-center" style="min-height: 100%;">' +
                    matchBox(bracket.gf) +
                    (champion
                        ? '<div class="mt-6 text-center"><p class="' + championLabelClass + '">Champion</p><p class="' + championNameClass + '">' + esc(champion) + '</p></div>'
                        : '') +
                '</div>' +
            '</div>';

        document.getElementById(targetId).innerHTML = html;
    }

    // ─── Tiers ───────────────────────────────────────────────
    function renderTiers(players) {
        var groups = [
            { label: 'Top Tier (S1–S6)', color: 'text-yellow-300', tier: 'Top' },
            { label: 'Mid Tier (S7–S12)', color: 'text-gray-300', tier: 'Mid' },
            { label: 'Low Tier (S13–S18)', color: 'text-gray-500', tier: 'Low' },
        ];

        var html = groups.map(function (g) {
            var rows = players.filter(function (p) {
                return p.tier === g.tier;
            }).map(function (p) {
                return '<div class="flex items-center gap-2 py-1">' +
                    '<img src="' + raceIcon(p.race) + '" class="h-5 w-5 object-contain" alt="">' +
                    '<span class="text-sm text-gray-200">' + esc(p.name) + '</span>' +
                '</div>';
            }).join('');

            return '<div class="match-card p-4 md:p-6">' +
                '<h3 class="italic-header mb-3 text-lg ' + g.color + '">' + g.label + '</h3>' +
                '<div class="space-y-1">' + rows + '</div>' +
            '</div>';
        }).join('');

        document.getElementById('tiers-list').innerHTML = html;
    }
})();
