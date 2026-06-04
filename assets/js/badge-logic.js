/**
 * Evaluates user statistics and returns the status of all available badges.
 * @param {Object} profile - The user's profile data
 * @param {Array} historyData - All quest history for the user
 * @param {Array} approvedDishes - Only the approved history items
 * @returns {Array} Array of badge objects with an added `isUnlocked` boolean
 */
window.evaluateBadges = function(profile, historyData, approvedDishes) {
    const lvl = profile.level || 1;
    const earnedBadges = profile.badges || [];
    
    // --- LOGIC CHALLENGES EVALUATION ---
    const hasMasterChef = lvl >= 5;
    const hasFirstBlood = approvedDishes.length > 0;
    const hasStarBaker = historyData.some(dish => dish.tasteRating === 5);
    
    // Logic Challenge: 3-day cooking streak
    let maxStreak = 0, currentStreak = 0, lastDate = null;
    const uniqueDays = [...new Set(approvedDishes.map(d => new Date(d.submittedAt || d.createdAt).setHours(0,0,0,0)))].sort();
    uniqueDays.forEach(day => {
        if (lastDate && day - lastDate === 86400000) currentStreak++; // 86400000ms = 1 day
        else currentStreak = 1;
        maxStreak = Math.max(maxStreak, currentStreak);
        lastDate = day;
    });
    const hasFireStarter = maxStreak >= 3;
    
    // Logic Challenge: Cook 5 healthy meals (Check if menu tags have Salad/Veg keywords)
    const allMenus = window.allRelatedMenus || [];
    const healthyCount = approvedDishes.filter(d => {
        const menuName = d.requestId?.menuName || '';
        const menu = allMenus.find(m => m.menuName === menuName);
        const tags = menu?.tags || [];
        return tags.some(t => typeof t === 'string' && (t.includes('สลัด') || t.includes('ผัก') || t.includes('คลีน')));
    }).length;
    const hasHealthyEats = healthyCount >= 5;

    // Define all badges and their logic triggers
    const ALL_BADGES = [
        { name: 'Master Chef', icon: '👨‍🍳', desc: 'Reach Level 5 (Platinum Chef)', logicUnlocked: hasMasterChef },
        { name: 'First Blood', icon: '🔪', desc: 'Complete your first cooking quest', logicUnlocked: hasFirstBlood },
        { name: 'Star Baker', icon: '⭐', desc: 'Get a 5-star taste rating on a quest', logicUnlocked: hasStarBaker },
        { name: 'Fire Starter', icon: '🔥', desc: 'Maintain a 3-day cooking streak', logicUnlocked: hasFireStarter },
        { name: 'Healthy Eats', icon: '🥗', desc: 'Cook 5 healthy meals (Salad/Veg)', logicUnlocked: hasHealthyEats }
    ];

    // Combine logic evaluation with DB saved badges
    return ALL_BADGES.map(badgeDef => {
        const inDB = earnedBadges.some(b => b.name === badgeDef.name || b.icon === badgeDef.icon);
        const isUnlocked = badgeDef.logicUnlocked || inDB;
        const isNewlyUnlocked = badgeDef.logicUnlocked && !inDB; // True if logic passes, but DB doesn't have it yet
        
        return { ...badgeDef, isUnlocked, isNewlyUnlocked };
    });
};

/**
 * Automatically syncs any newly earned badges to the database
 * @param {Array} evaluatedBadges - The array returned from evaluateBadges
 */
window.syncNewBadges = async function(evaluatedBadges) {
    // No-op: Badge checks and awarding are handled securely on the server-side
};