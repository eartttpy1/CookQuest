if ('onconnect' in self) {
    self.onconnect = function(e) {
        const port = e.ports[0];
        port.onmessage = async function(event) {
            await handleWorkerMessage(event.data, port);
        };
    };
} else {
    self.onmessage = async function(event) {
        await handleWorkerMessage(event.data, self);
    };
}

async function handleWorkerMessage(data, target) {
    const { userId, token } = data;

    try {
        const fetchPromises = [
            fetch(`http://localhost:4000/api/quests?_t=${Date.now()}`),
            fetch(`http://localhost:4000/api/menus?_t=${Date.now()}`),
            fetch(`http://localhost:4000/api/favorites?userId=${userId}&_t=${Date.now()}`),
            fetch(`http://localhost:4000/api/history?userId=${userId}&summary=true&_t=${Date.now()}`)
        ];

        if (token) {
            fetchPromises.push(
                fetch(`http://localhost:4000/api/profile?_t=${Date.now()}`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            );
        }

        const responses = await Promise.all(fetchPromises);
        
        const questsResponse = responses[0];
        const menusResponse = responses[1];
        const favResponse = responses[2];
        const historyResponse = responses[3];
        const profileResponse = responses[4];

        if (!questsResponse.ok) throw new Error('Failed to load quests');
        if (!menusResponse.ok) throw new Error('Failed to load menus');

        const quests = await questsResponse.json();
        const menus = await menusResponse.json();
        
        let favState = {};
        if (favResponse && favResponse.ok) {
            const favorites = await favResponse.json();
            favorites.forEach(fav => {
                const menuIdStr = (fav.menuId && typeof fav.menuId === 'object' && fav.menuId._id)
                    ? fav.menuId._id.toString()
                    : (fav.menuId ? fav.menuId.toString() : '');
                if (menuIdStr) favState[menuIdStr] = true;
            });
        }

        let menuStatusMap = {};
        let history = [];
        if (historyResponse && historyResponse.ok) {
            history = await historyResponse.json();
            
            // Group statuses by menuName
            const menuStatuses = {};
            history.forEach(sub => {
                const req = sub.requestId;
                if (req && req.menuName) {
                    const mName = req.menuName;
                    if (!menuStatuses[mName]) {
                        menuStatuses[mName] = new Set();
                    }
                    menuStatuses[mName].add(sub.status);
                }
            });
            
            // Resolve final status for each menu
            for (const mName in menuStatuses) {
                const statuses = menuStatuses[mName];
                if (statuses.has('pending')) {
                    // Pending takes highest priority because it means a new submission is waiting review
                    menuStatusMap[mName] = 'pending';
                } else if (statuses.has('approved')) {
                    // If no pending, but has approved, it's approved (even if there is rejected)
                    menuStatusMap[mName] = 'approved';
                } else if (statuses.has('rejected')) {
                    // Only rejected exists
                    menuStatusMap[mName] = 'rejected';
                }
            }
        }

        let profile = null;
        if (profileResponse && profileResponse.ok) {
            profile = await profileResponse.json();
        }

        // Optimization: Create a fast lookup for menus by questId and tag
        const menusByQuestId = {};
        const menusByTag = {};
        menus.forEach(menu => {
            if (menu.questIds) {
                menu.questIds.forEach(qId => {
                    if (!menusByQuestId[qId]) menusByQuestId[qId] = [];
                    menusByQuestId[qId].push(menu);
                });
            }
            if (menu.menuName) {
                const tag = menu.menuName.toLowerCase();
                if (!menusByTag[tag]) menusByTag[tag] = [];
                menusByTag[tag].push(menu);
            }
        });

        // Pre-calculate related menus for each quest to save UI thread time
        const rankOrder = {
            'bronze': 1, 'silver': 2, 'gold': 3,
            'platinum': 4, 'diamond': 5, 'master': 6
        };
        const processedQuests = quests.map(quest => {
            const relatedSet = new Set();
            
            // By Quest ID
            if (menusByQuestId[quest._id]) {
                menusByQuestId[quest._id].forEach(m => relatedSet.add(m));
            }
            
            // By Tag
            if (quest.tags) {
                quest.tags.forEach(t => {
                    const tag = t.toLowerCase();
                    if (menusByTag[tag]) {
                        menusByTag[tag].forEach(m => relatedSet.add(m));
                    }
                });
            }
            
            const relatedMenus = Array.from(relatedSet);
            
            // Find highest rank
            let highestRank = 'bronze';
            let highestRankValue = 0;
            
            relatedMenus.forEach(menu => {
                const menuExp = menu.EXP || 0;
                let r = 'bronze';
                if (menuExp >= 100 && menuExp <= 150) r = 'bronze';
                else if (menuExp >= 151 && menuExp <= 200) r = 'silver';
                else if (menuExp >= 201 && menuExp <= 250) r = 'gold';
                else if (menuExp >= 251 && menuExp <= 300) r = 'platinum';
                else if (menuExp >= 301 && menuExp <= 500) r = 'diamond';
                else if (menuExp >= 501) r = 'master';

                if (rankOrder[r] && rankOrder[r] > highestRankValue) {
                    highestRankValue = rankOrder[r];
                    highestRank = r;
                }
            });

            // Images — keep menu ids for lazy loading, skip heavy base64 in worker payload
            const defaultPlaceholders = [
                '../../assets/img/steak1.png',
                '../../assets/img/steak2.png',
                '../../assets/img/steak3.png',
                '../../assets/img/emptymenu.jpg'
            ];
            const imageUrls = relatedMenus.slice(0, 4).map((menu, index) => ({
                menuId: menu._id,
                url: menu.imageURL || defaultPlaceholders[index] || defaultPlaceholders[0]
            }));
            while (imageUrls.length < 4) {
                imageUrls.push({
                    menuId: '',
                    url: defaultPlaceholders[imageUrls.length]
                });
            }

            // Check if all related menus are approved by the user
            let isQuestComplete = relatedMenus.length > 0;
            relatedMenus.forEach(menu => {
                if (menuStatusMap[menu.menuName] !== 'approved') {
                    isQuestComplete = false;
                }
            });

            return {
                ...quest,
                processedData: {
                    imageUrls,
                    highestRank,
                    isQuestComplete
                }
            };
        });

        target.postMessage({
            success: true,
            quests: processedQuests,
            menus,
            favState,
            menuStatusMap,
            history,
            profile
        });
    } catch (error) {
        target.postMessage({
            success: false,
            error: error.message
        });
    }
}
