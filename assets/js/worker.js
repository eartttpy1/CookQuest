self.onmessage = async function(e) {
    const { userId } = e.data;

    try {
        const [questsResponse, menusResponse, favResponse, historyResponse] = await Promise.all([
            fetch('/api/quests'),
            fetch('/api/menus'),
            fetch(`/api/favorites?userId=${userId}`),
            fetch('/api/history')
        ]);

        if (!questsResponse.ok) throw new Error('Failed to load quests');
        if (!menusResponse.ok) throw new Error('Failed to load menus');

        const quests = await questsResponse.json();
        const menus = await menusResponse.json();
        
        let favState = {};
        if (favResponse && favResponse.ok) {
            const favorites = await favResponse.json();
            favorites.forEach(fav => {
                if (fav.menuId) favState[fav.menuId] = true;
            });
        }

        let menuStatusMap = {};
        if (historyResponse && historyResponse.ok) {
            const history = await historyResponse.json();
            history.forEach(sub => {
                const req = sub.requestId;
                if (req && req.menuName) {
                    const mName = req.menuName;
                    const newStatus = sub.status;
                    const currentStatus = menuStatusMap[mName];
                    if (!currentStatus) {
                        menuStatusMap[mName] = newStatus;
                    } else if (currentStatus !== 'approved') {
                        if (newStatus === 'approved') {
                            menuStatusMap[mName] = 'approved';
                        } else if (newStatus === 'pending' && currentStatus === 'rejected') {
                            menuStatusMap[mName] = 'pending';
                        }
                    }
                }
            });
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
            const rankOrder = {
                'bronze': 1, 'silver': 2, 'gold': 3,
                'platinum': 4, 'diamond': 5, 'master': 6
            };
            let highestRank = 'bronze';
            let highestRankValue = 0;
            
            relatedMenus.forEach(menu => {
                const r = (menu.rank || 'bronze').toLowerCase();
                if (rankOrder[r] && rankOrder[r] > highestRankValue) {
                    highestRankValue = rankOrder[r];
                    highestRank = r;
                }
            });

            // Images
            const imageUrls = relatedMenus.map(m => m.imageURL).filter(url => url).slice(0, 4);
            const defaultPlaceholders = [
                '../../assets/img/steak1.png',
                '../../assets/img/steak2.png',
                '../../assets/img/steak3.png',
                '../../assets/img/emptymenu.jpg'
            ];
            while (imageUrls.length < 4) {
                imageUrls.push(defaultPlaceholders[imageUrls.length]);
            }

            return {
                ...quest,
                processedData: {
                    imageUrls,
                    highestRank
                }
            };
        });

        self.postMessage({
            success: true,
            quests: processedQuests,
            menus,
            favState,
            menuStatusMap
        });
    } catch (error) {
        self.postMessage({
            success: false,
            error: error.message
        });
    }
};
