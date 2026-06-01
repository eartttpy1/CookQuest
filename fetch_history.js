const http = require('http');

function getJSON(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  try {
    console.log('Fetching all history...');
    const allHistory = await getJSON('http://localhost:4000/api/history');
    console.log(`Total history items: ${allHistory.length}`);
    if (allHistory.length > 0) {
      console.log('Sample item:', JSON.stringify(allHistory[0], null, 2));
    }

    console.log('\nFetching history for "ผัดไทย"...');
    const phadThaiHistory = await getJSON('http://localhost:4000/api/history?menuName=' + encodeURIComponent('ผัดไทย'));
    console.log(`Phad Thai history items: ${phadThaiHistory.length}`);
    if (phadThaiHistory.length > 0) {
      console.log('Sample Phad Thai item:', JSON.stringify(phadThaiHistory[0], null, 2));
    }

    console.log('\nFetching history for non-existent menu...');
    const nonExistentHistory = await getJSON('http://localhost:4000/api/history?menuName=' + encodeURIComponent('DoesNotExist'));
    console.log(`Non-existent history items: ${nonExistentHistory.length}`);

  } catch (err) {
    console.error(err);
  }
}

main();
