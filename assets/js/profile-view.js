document.addEventListener('DOMContentLoaded', async () => {
    try {
      const userDataStr = localStorage.getItem('user_data');
      if (!userDataStr) return;
      const userData = JSON.parse(userDataStr);
      const userId = userData.user.id;
      const token = localStorage.getItem('authToken');

      let chartInstance = null;
      
      const renderView = (profile, historyData) => {
          // 2. Calculate and display Level, Rank, and XP Bar
          const levelSystem = {
            1: { rank: 'BRONZE Chef', minXP: 0, maxXP: 1500 },
            2: { rank: 'SILVER Chef', minXP: 1501, maxXP: 3000 },
            3: { rank: 'GOLD Chef', minXP: 3001, maxXP: 5000 },
            4: { rank: 'PLATINUM Chef', minXP: 5001, maxXP: 8000 },
            5: { rank: 'DIAMOND Chef', minXP: 8001, maxXP: 12000 },
            6: { rank: 'MASTER Chef', minXP: 12001, maxXP: Infinity }
          };
          const xp = profile.xp || 0;
          
          let lvl = 1;
          for (let l = 6; l >= 1; l--) {
              if (xp >= levelSystem[l].minXP) {
                  lvl = l;
                  break;
              }
          }
          const currentLevelData = levelSystem[lvl];
          const tierSize = currentLevelData.maxXP - currentLevelData.minXP;
          const progressInTier = xp - currentLevelData.minXP;
          const xpPercentage = tierSize === Infinity ? 100 : Math.min((progressInTier / tierSize) * 100, 100);
          const maxDisplay = currentLevelData.maxXP === Infinity ? 'MAX' : currentLevelData.maxXP;

          document.getElementById('view-level-title').textContent = `Level ${lvl} ${currentLevelData.rank}`;
          document.getElementById('view-xp-text').textContent = `${xp}/${maxDisplay} EXP`;
          document.querySelector('.xp-fill').style.width = `${xpPercentage}%`;

          // 1. Filter only 'approved' dishes and sort them by date (oldest to newest)
          const approvedDishes = historyData.filter(item => item.status === 'approved');
          approvedDishes.sort((a, b) => new Date(a.submittedAt || a.createdAt) - new Date(b.submittedAt || b.createdAt));

          // 2. Group the dishes by Date
          const dateCounts = {};
          approvedDishes.forEach(dish => {
            const date = new Date(dish.submittedAt || dish.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
            dateCounts[date] = (dateCounts[date] || 0) + 1;
          });

          const labels = Object.keys(dateCounts);
          const dailyCounts = Object.values(dateCounts);

          // 3. Make the data cumulative so the chart shows total progress over time
          let total = 0;
          const cumulativeData = dailyCounts.map(count => {
            total += count;
            return total;
          });

          const isDarkMode = document.body.classList.contains('darkmode');
          const textColor = isDarkMode ? '#bbb' : '#666';
          const gridColor = isDarkMode ? '#444' : '#eaeaea';

          // 4. Render the Chart
          const ctx = document.getElementById('progressChart').getContext('2d');
          if (chartInstance) chartInstance.destroy(); // destroy old chart if re-rendering
          chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
              labels: labels.length ? labels : ['No Data'],
              datasets: [{
                label: 'Total Completed Dishes',
                data: cumulativeData.length ? cumulativeData : [0],
                borderColor: '#800002',
                backgroundColor: 'rgba(128, 0, 2, 0.15)',
                borderWidth: 3,
                fill: true,
                tension: 0.4, 
                pointBackgroundColor: '#fff',
                pointBorderColor: '#800002',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
              }]
            },
            options: {
              responsive: true,
              scales: { 
                  x: { ticks: { color: textColor }, grid: { color: gridColor } }, 
                  y: { beginAtZero: true, ticks: { stepSize: 1, color: textColor }, grid: { color: gridColor } } 
              },
              plugins: { legend: { display: false } }
            }
          });

          // 4. Render All Badges (Locked/Unlocked) from Database
          const badgeGrid = document.getElementById('view-badge-grid');
          
          // Ensure the profile object has the dynamically calculated level for badge logic
          profile.level = lvl;
          profile.rank = currentLevelData.rank;

          // Use the logic from our separate file to evaluate badges
          const evaluatedBadges = window.evaluateBadges 
              ? window.evaluateBadges(profile, historyData, approvedDishes) 
              : [];
              
          // Automatically save any newly unlocked badges to the database!
          if (window.syncNewBadges && evaluatedBadges.length > 0) {
              window.syncNewBadges(evaluatedBadges);
          }

          let badgeHTML = ``;
          evaluatedBadges.forEach(badgeDef => {
              const filterStyle = badgeDef.isUnlocked ? '' : 'filter: grayscale(100%) opacity(40%);';
              const bgStyle = badgeDef.isUnlocked ? 'background: linear-gradient(135deg, #d32f2f, #9e0002); color: white;' : 'background: #444; color: #888;';
              const title = badgeDef.isUnlocked ? badgeDef.name : `Locked: ${badgeDef.name}\n${badgeDef.desc}`;

              badgeHTML += `
                <div class="badge-card" 
                     data-name="${badgeDef.name}" 
                     data-desc="${badgeDef.desc}" 
                     data-icon="${badgeDef.icon}" 
                     data-unlocked="${badgeDef.isUnlocked}" 
                     title="${title}" 
                     style="${filterStyle} transition: all 0.3s ease; cursor: pointer;">
                    <div class="badge-icon ${badgeDef.isUnlocked ? 'unlocked-badge' : ''}" style="${bgStyle} border-radius: 50%;">${badgeDef.icon}</div>
                    <p>${badgeDef.name}</p>
                </div>
              `;
          });
          
          badgeGrid.innerHTML = badgeHTML;
      };

      const showSkeletonLoadersInView = () => {
          document.getElementById('view-level-title').innerHTML = '<div class="skeleton-bg" style="height: 24px; width: 150px; border-radius: 4px; margin-bottom: 8px;"></div>';
          document.getElementById('view-xp-text').innerHTML = '<div class="skeleton-bg" style="height: 16px; width: 80px; border-radius: 4px; float: right;"></div>';
          
          const badgeGrid = document.getElementById('view-badge-grid');
          if (badgeGrid) {
              badgeGrid.innerHTML = `
                  <div class="badge-card skeleton-card" style="opacity: 0.7;">
                      <div class="badge-icon skeleton-bg-main" style="box-shadow: none; background: transparent;"></div>
                      <div class="skeleton-bg" style="height: 16px; width: 80%; border-radius: 4px;"></div>
                  </div>
              `.repeat(6);
          }
      };

      const cacheKey = `profile_view_cache_${userId}`;
      const cachedData = sessionStorage.getItem(cacheKey);
      
      if (cachedData) {
          try {
              const parsed = JSON.parse(cachedData);
              renderView(parsed.profile, parsed.historyData);
          } catch (e) {
              console.error('Cache parsing failed', e);
              showSkeletonLoadersInView();
          }
      } else {
          showSkeletonLoadersInView();
      }

      // Fetch fresh data in the background
      if (window.Worker) {
          let worker;
          let workerPort;
          if (typeof SharedWorker !== 'undefined') {
              worker = new SharedWorker('../../assets/js/worker.js');
              workerPort = worker.port;
              workerPort.start();
          } else {
              worker = new Worker('../../assets/js/worker.js');
              workerPort = worker;
          }

          workerPort.postMessage({ userId, token });

          workerPort.onmessage = function(e) {
              const data = e.data;
              if (!data.success) {
                  console.error('Worker error:', data.error);
                  return;
              }

              const freshProfile = data.profile || null;
              const freshHistoryData = data.history || [];

              if (freshProfile) {
                  try {
                      sessionStorage.setItem(cacheKey, JSON.stringify({
                          profile: freshProfile,
                          historyData: freshHistoryData
                      }));
                  } catch (err) {
                      console.warn('Quota exceeded for session storage', err);
                  }
                  renderView(freshProfile, freshHistoryData);
              }
          };

          if (typeof SharedWorker === 'undefined') {
              worker.onerror = function(error) {
                  console.error('Worker failed:', error);
              };
          }
      }

      // Setup Modal Click Events for Badges
      const badgeModal = document.getElementById('badgeModal');
      const closeBadgeModal = document.getElementById('closeBadgeModal');
      
      if (badgeModal && closeBadgeModal) {
          // Close modal logic
          closeBadgeModal.addEventListener('click', () => badgeModal.classList.add('hidden'));
          badgeModal.addEventListener('click', (e) => {
              if (e.target === badgeModal) badgeModal.classList.add('hidden');
          });
          
          // Open modal logic when clicking a badge
          const viewBadgeGrid = document.getElementById('view-badge-grid');
          if (viewBadgeGrid) {
              viewBadgeGrid.addEventListener('click', (e) => {
                  const card = e.target.closest('.badge-card');
                  if (!card) return;
    
                  const isUnlocked = card.dataset.unlocked === 'true';
    
                  // Set Modal Content
                  const modalIcon = document.getElementById('modalBadgeIcon');
                  modalIcon.textContent = card.dataset.icon;
                  modalIcon.style.background = isUnlocked ? 'linear-gradient(135deg, #d32f2f, #9e0002)' : '#444';
                  modalIcon.style.color = isUnlocked ? 'white' : '#888';
                  modalIcon.style.filter = isUnlocked ? 'none' : 'grayscale(100%) opacity(40%)';
                  
                  if (isUnlocked) {
                      modalIcon.classList.add('unlocked-badge');
                  } else {
                      modalIcon.classList.remove('unlocked-badge');
                  }

                  // Re-trigger animation
                  modalIcon.classList.remove('icon-animate');
                  void modalIcon.offsetWidth; // trigger reflow to restart animation
                  modalIcon.classList.add('icon-animate');
                  
                  document.getElementById('modalBadgeName').textContent = card.dataset.name;
                  document.getElementById('modalBadgeDesc').textContent = card.dataset.desc;
                  
                  const statusEl = document.getElementById('modalBadgeStatus');
                  if (isUnlocked) {
                      statusEl.textContent = '✅ Unlocked';
                      statusEl.style.backgroundColor = document.body.classList.contains('darkmode') ? 'rgba(46, 125, 50, 0.3)' : '#e8f5e9';
                      statusEl.style.color = document.body.classList.contains('darkmode') ? '#81c784' : '#2e7d32';
                  } else {
                      statusEl.textContent = '🔒 Locked';
                      statusEl.style.backgroundColor = document.body.classList.contains('darkmode') ? '#444' : '#eeeeee';
                      statusEl.style.color = document.body.classList.contains('darkmode') ? '#bbb' : '#757575';
                  }
    
                  // Show the modal
                  badgeModal.classList.remove('hidden');
              });
          }
      }

      // Initialize Socket.io connection on profile-view page
      const socket = typeof io !== 'undefined' ? io('http://localhost:4000') : null;
      if (socket) {
          socket.on('status_updated', () => {
              sessionStorage.removeItem(cacheKey);
              sessionStorage.removeItem(`cookquest_cache_${userId}`);
              location.reload();
          });
          socket.on('new_submission', () => {
              sessionStorage.removeItem(cacheKey);
              sessionStorage.removeItem(`cookquest_cache_${userId}`);
              location.reload();
          });
      }
    } catch (err) {
      console.error('Failed to load progress chart:', err);
    }
  });

  // Instant Chart Theme Refresh Handler
  document.addEventListener('click', (e) => {
      if (e.target.closest('.theme-option') || e.target.closest('#theme-switch')) {
          setTimeout(() => {
              // Force Chart.js to recalculate its text colors based on the new theme
              if (window.chartInstance) {
                  const isDarkMode = document.body.classList.contains('darkmode');
                  const textColor = isDarkMode ? '#bbb' : '#666';
                  const gridColor = isDarkMode ? '#444' : '#eaeaea';
                  window.chartInstance.options.scales.x.ticks.color = textColor;
                  window.chartInstance.options.scales.x.grid.color = gridColor;
                  window.chartInstance.options.scales.y.ticks.color = textColor;
                  window.chartInstance.options.scales.y.grid.color = gridColor;
                  window.chartInstance.update();
              }
          }, 50); 
      }
  });