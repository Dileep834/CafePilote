const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.ts') || file.endsWith('.tsx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk(path.join(__dirname, 'src'));

let replacementsMade = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    const originalContent = content;

    // 1. Terminology standardisations
    content = content.replace(/Current Stock/g, 'Live Inventory');
    content = content.replace(/Waste Entry/g, 'Wastage Log');
    content = content.replace(/Sales Entry/g, 'Point of Sale (POS)');
    // Just in case it was "Point of Sale (POS)" already in some places
    // Make sure we handle "Purchases" but carefully so we don't break variable names.
    // Actually, "Purchases" as a string or menu item is safe.
    content = content.replace(/'Purchases'/g, "'Purchase Orders'");
    content = content.replace(/>Purchases</g, ">Purchase Orders<");
    content = content.replace(/Recipes \(BOM\)/g, 'Recipe Master');

    // 2. Franchise -> Outlet
    content = content.replace(/Franchises\.tsx/g, 'Outlets.tsx');
    content = content.replace(/FranchiseDashboard\.tsx/g, 'OutletDashboard.tsx');
    content = content.replace(/franchiseDashboard/g, 'outletDashboard');
    content = content.replace(/FranchiseDashboard/g, 'OutletDashboard');
    content = content.replace(/Franchises/g, 'Outlets');
    content = content.replace(/franchises/g, 'outlets');
    content = content.replace(/Franchise/g, 'Outlet');
    content = content.replace(/franchise/g, 'outlet');
    content = content.replace(/FRANCHISE_OWNER/g, 'OUTLET_OWNER');

    if (content !== originalContent) {
        fs.writeFileSync(file, content, 'utf8');
        replacementsMade++;
        console.log(`Updated ${file}`);
    }
});

console.log(`\nSuccessfully updated ${replacementsMade} files.`);
