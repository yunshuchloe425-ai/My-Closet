// 数据管理
class SmartCloset {
    constructor() {
        this.clothes = this.loadData('clothes', []);
        this.outfits = this.loadData('outfits', []);
        this.shoppingList = this.loadData('shoppingList', []);
        this.init();
    }

    loadData(key, defaultValue) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error('Error loading data:', error);
            return defaultValue;
        }
    }

    saveData(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error('Error saving data:', error);
        }
    }

    // 衣服管理
    addCloth(cloth) {
        const newCloth = {
            id: Date.now(),
            ...cloth,
            image: cloth.image || null,
            createdAt: new Date().toISOString()
        };
        this.clothes.push(newCloth);
        this.saveData('clothes', this.clothes);
        return newCloth;
    }

    getClothesByFilter(filterType, filterValue) {
        if (!filterValue || (Array.isArray(filterValue) && filterValue.length === 0)) {
            return this.clothes;
        }
        
        if (filterType === 'occasion') {
            // 场合支持多选查询
            if (Array.isArray(filterValue)) {
                // 当查询条件是数组时，找到包含任何一个查询条件的衣服
                return this.clothes.filter(cloth => 
                    Array.isArray(cloth.occasion) && 
                    cloth.occasion.some(occ => filterValue.includes(occ))
                );
            } else {
                // 当查询条件是单个值时，找到包含该值的衣服
                return this.clothes.filter(cloth => 
                    Array.isArray(cloth.occasion) && 
                    cloth.occasion.includes(filterValue)
                );
            }
        }
        
        // 其他类型单选
        return this.clothes.filter(cloth => cloth[filterType] === filterValue);
    }

    // 删除衣服
    deleteCloth(clothId) {
        if (!confirm('确定要删除这件衣服吗？这将同时删除与它相关的所有搭配记录。')) {
            return;
        }

        // 从衣服列表中删除
        this.clothes = this.clothes.filter(cloth => cloth.id !== clothId);
        this.saveData('clothes', this.clothes);



        // 从outfits中删除引用
        this.outfits = this.outfits.map(outfit => ({
            ...outfit,
            outfit: outfit.outfit.filter(id => id !== clothId)
        })).filter(outfit => outfit.outfit.length > 0);
        this.saveData('outfits', this.outfits);

        // 从dailyOutfits中删除引用
        const dailyOutfits = this.loadData('dailyOutfits', {});
        for (const date in dailyOutfits) {
            dailyOutfits[date] = dailyOutfits[date].filter(id => id !== clothId);
            if (dailyOutfits[date].length === 0) {
                delete dailyOutfits[date];
            }
        }
        this.saveData('dailyOutfits', dailyOutfits);

        // 刷新相关UI
        const currentTab = document.querySelector('.tab-content[style*="display: block"]');
        if (currentTab.id === 'browseClothes') {
            const currentFilter = document.querySelector('input[name="filter"]:checked').value;
            this.handleFilterChange(currentFilter);
        } else if (currentTab.id === 'outfit') {
            this.renderSelectGrid();
        }

        alert('衣服删除成功！');
    }

    // 搭配管理
    generateRandomOutfit() {
        const tops = this.clothes.filter(cloth => ['上衣', 'T恤', '衬衫', '毛衣'].includes(cloth.category));
        const bottoms = this.clothes.filter(cloth => ['裤子', '裙子'].includes(cloth.category));
        const outerwear = this.clothes.filter(cloth => ['外套'].includes(cloth.category));
        const shoes = this.clothes.filter(cloth => ['鞋包'].includes(cloth.category));

        const outfit = [];
        if (tops.length > 0) outfit.push(tops[Math.floor(Math.random() * tops.length)]);
        if (bottoms.length > 0) outfit.push(bottoms[Math.floor(Math.random() * bottoms.length)]);
        if (outerwear.length > 0 && Math.random() > 0.5) outfit.push(outerwear[Math.floor(Math.random() * outerwear.length)]);
        if (shoes.length > 0) outfit.push(shoes[Math.floor(Math.random() * shoes.length)]);

        return outfit;
    }

    saveOutfit(outfit) {
        const newOutfit = {
            id: Date.now(),
            outfit: outfit.map(cloth => cloth.id),
            createdAt: new Date().toISOString()
        };
        this.outfits.push(newOutfit);
        this.saveData('outfits', this.outfits);
        return newOutfit;
    }

    // 购物清单管理
    addShoppingItem(item) {
        const newItem = {
            id: Date.now(),
            name: item,
            createdAt: new Date().toISOString()
        };
        this.shoppingList.push(newItem);
        this.saveData('shoppingList', this.shoppingList);
        return newItem;
    }

    removeShoppingItem(id) {
        this.shoppingList = this.shoppingList.filter(item => item.id !== id);
        this.saveData('shoppingList', this.shoppingList);
        this.renderShoppingList(); // 删除后重新渲染购物清单
    }



    // 初始化
    init() {
        this.bindEvents();
        this.checkAndFixDataStructure(); // 检查并修复数据结构
        this.renderCalendar();
        this.renderShoppingList();
    }

    // 事件绑定
    bindEvents() {
        // 标签页切换
        document.getElementById('addBtn').addEventListener('click', () => this.showTab('addClothes'));
        document.getElementById('browseBtn').addEventListener('click', () => this.showTab('browseClothes'));
        document.getElementById('outfitBtn').addEventListener('click', () => this.showTab('outfit'));
        document.getElementById('toolsBtn').addEventListener('click', () => this.showTab('tools'));

        // 添加衣服表单
        document.getElementById('addForm').addEventListener('submit', (e) => this.handleAddFormSubmit(e));

        // 快速模板
        document.querySelectorAll('.template-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleQuickTemplate(e));
        });

        // 分类浏览
        document.querySelectorAll('input[name="filter"]').forEach(radio => {
            radio.addEventListener('change', (e) => this.handleFilterChange(e.target.value));
        });

        // 搭配功能
        document.getElementById('randomBtn').addEventListener('click', () => this.handleRandomOutfit());
        document.getElementById('saveOutfitBtn').addEventListener('click', () => this.handleSaveOutfit());
        document.getElementById('selectCategory').addEventListener('change', (e) => this.handleSelectCategoryChange(e));


        // 购物清单
        document.getElementById('shoppingForm').addEventListener('submit', (e) => this.handleShoppingSubmit(e));
    }

    // 标签页切换
    showTab(tabName) {
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.style.display = 'none';
        });
        document.getElementById(tabName).style.display = 'block';
        
        // 清除所有搭配显示
        const outfitSections = document.querySelectorAll('.daily-outfit-section');
        outfitSections.forEach(section => section.remove());

        if (tabName === 'browseClothes') {
            this.handleFilterChange('category');
        } else if (tabName === 'outfit') {
            this.handleRandomOutfit();
            this.renderSelectGrid();
        }
    }

    // 处理选择分类变化
    handleSelectCategoryChange(e) {
        const category = e.target.value;
        this.renderSelectGrid(category);
    }

    // 渲染可选衣服列表
    renderSelectGrid(category = '') {
        const selectGrid = document.getElementById('selectGrid');
        const filteredClothes = category ? this.clothes.filter(cloth => cloth.category === category) : this.clothes;
        
        selectGrid.innerHTML = filteredClothes.map(cloth => `
            <div class="clothes-card select-card" onclick="closet.addToOutfit(${cloth.id})">
                ${cloth.image ? `<img src="${cloth.image}" alt="${cloth.name}">` : `<div class="no-image">${cloth.name}</div>`}
                <h4>${cloth.name}</h4>
                <p>${cloth.category}</p>
            </div>
        `).join('');
    }

    // 添加衣服到搭配
    addToOutfit(clothId) {
        const outfitGrid = document.getElementById('outfitGrid');
        const existingOutfit = JSON.parse(outfitGrid.dataset.outfit || '[]');
        
        // 检查衣服是否已经在搭配中
        if (existingOutfit.some(cloth => cloth.id === clothId)) {
            alert('这件衣服已经在搭配中了！');
            return;
        }
        
        // 获取衣服信息
        const cloth = this.clothes.find(c => c.id === clothId);
        if (!cloth) return;
        
        // 添加到搭配
        const newOutfit = [...existingOutfit, cloth];
        
        // 更新显示
        outfitGrid.innerHTML = newOutfit.map(cloth => `
            <div class="clothes-card" onclick="closet.removeFromOutfit(${cloth.id})">
                ${cloth.image ? `<img src="${cloth.image}" alt="${cloth.name}">` : `<div class="no-image">${cloth.name}</div>`}
                <h4>${cloth.name}</h4>
                <button class="remove-btn">×</button>
            </div>
        `).join('');
        
        outfitGrid.dataset.outfit = JSON.stringify(newOutfit);
    }

    // 从搭配中移除衣服
    removeFromOutfit(clothId) {
        const outfitGrid = document.getElementById('outfitGrid');
        let existingOutfit = JSON.parse(outfitGrid.dataset.outfit || '[]');
        
        // 移除指定衣服
        existingOutfit = existingOutfit.filter(cloth => cloth.id !== clothId);
        
        // 更新显示
        outfitGrid.innerHTML = existingOutfit.map(cloth => `
            <div class="clothes-card" onclick="closet.removeFromOutfit(${cloth.id})">
                ${cloth.image ? `<img src="${cloth.image}" alt="${cloth.name}">` : `<div class="no-image">${cloth.name}</div>`}
                <h4>${cloth.name}</h4>
                <button class="remove-btn">×</button>
            </div>
        `).join('');
        
        outfitGrid.dataset.outfit = JSON.stringify(existingOutfit);
    }

    // 处理添加衣服表单
    handleAddFormSubmit(e) {
        e.preventDefault();
        
        // 获取选中的场合
        const selectedOccasions = Array.from(document.querySelectorAll('input[name="occasion"]:checked'))
            .map(checkbox => checkbox.value);
        
        const cloth = {
            name: document.getElementById('name').value,
            category: document.getElementById('category').value,
            season: document.getElementById('season').value,
            occasion: selectedOccasions
        };

        // 处理图片上传
        const imageInput = document.getElementById('image');
        if (imageInput.files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => {
                cloth.image = event.target.result;
                this.addCloth(cloth);
                this.resetAddForm();
                alert('衣服添加成功！');
            };
            reader.readAsDataURL(imageInput.files[0]);
        } else {
            this.addCloth(cloth);
            this.resetAddForm();
            alert('衣服添加成功！');
        }
    }

    resetAddForm() {
        document.getElementById('addForm').reset();
    }

    // 处理快速模板
    handleQuickTemplate(e) {
        const category = e.target.dataset.category;
        const cloth = {
            name: category,
            category: category,
            season: '四季',
            occasion: [] // 默认没有场合
        };
        this.addCloth(cloth);
        alert(`${category} 添加成功！`);
    }

    // 处理分类浏览
    handleFilterChange(filterType) {
        const filterOptions = document.getElementById('filterOptions');
        const clothesGrid = document.getElementById('clothesGrid');
        
        let values;
        
        // 场合使用固定的四个选项
        if (filterType === 'occasion') {
            values = ['工作', '休闲', '运动', '正式'];
        } else {
            // 其他类型使用动态提取的值
            values = [...new Set(this.clothes.map(cloth => cloth[filterType]))];
        }
        
        // 生成过滤选项
        filterOptions.innerHTML = values.map(value => 
            `<button class="filter-option" data-type="${filterType}" data-value="${value}">${value}</button>`
        ).join('');
        
        // 添加选项点击事件
        document.querySelectorAll('.filter-option').forEach(option => {
            option.addEventListener('click', (e) => {
                if (filterType === 'occasion') {
                    // 场合支持多选
                    e.target.classList.toggle('active');
                    const activeOptions = Array.from(document.querySelectorAll('.filter-option.active'))
                        .map(opt => opt.dataset.value);
                    this.renderClothesGrid(filterType, activeOptions);
                } else {
                    // 其他类型单选
                    document.querySelectorAll('.filter-option').forEach(opt => opt.classList.remove('active'));
                    e.target.classList.add('active');
                    this.renderClothesGrid(filterType, e.target.dataset.value);
                }
            });
        });
        
        // 默认显示所有衣服
        this.renderClothesGrid(filterType, filterType === 'occasion' ? [] : '');
    }

    renderClothesGrid(filterType, filterValue) {
        const clothesGrid = document.getElementById('clothesGrid');
        const filteredClothes = this.getClothesByFilter(filterType, filterValue);
        
        clothesGrid.innerHTML = filteredClothes.map(cloth => `
            <div class="clothes-card">
                ${cloth.image ? `<img src="${cloth.image}" alt="${cloth.name}">` : `<div class="no-image">${cloth.name}</div>`}
                <h4>${cloth.name}</h4>
                <p>${cloth.category}</p>
                <p>${cloth.season}</p>
                <p class="occasion-tags">
                    ${Array.isArray(cloth.occasion) ? cloth.occasion.join(' / ') : cloth.occasion}
                </p>
                <div class="cloth-actions">
                    <button class="delete-btn" onclick="closet.deleteCloth(${cloth.id})">删除</button>
                </div>
            </div>
        `).join('');
    }

    // 处理搭配功能
    handleRandomOutfit() {
        const outfit = this.generateRandomOutfit();
        const outfitGrid = document.getElementById('outfitGrid');
        outfitGrid.innerHTML = outfit.map(cloth => `
            <div class="clothes-card" onclick="closet.removeFromOutfit(${cloth.id})">
                ${cloth.image ? `<img src="${cloth.image}" alt="${cloth.name}">` : `<div class="no-image">${cloth.name}</div>`}
                <h4>${cloth.name}</h4>
                <button class="remove-btn">×</button>
            </div>
        `).join('');
        outfitGrid.dataset.outfit = JSON.stringify(outfit);
    }

    handleSaveOutfit() {
        const outfitGrid = document.getElementById('outfitGrid');
        const outfit = JSON.parse(outfitGrid.dataset.outfit || '[]');
        if (outfit.length === 0) {
            alert('请先生成搭配！');
            return;
        }
        this.saveOutfit(outfit);
        alert('搭配保存成功！');
    }

    // 处理购物清单
    handleShoppingSubmit(e) {
        e.preventDefault();
        const itemName = document.getElementById('shoppingItem').value;
        if (itemName.trim()) {
            this.addShoppingItem(itemName.trim());
            this.renderShoppingList();
            document.getElementById('shoppingForm').reset();
        }
    }

    renderShoppingList() {
        const shoppingList = document.getElementById('shoppingList');
        shoppingList.innerHTML = this.shoppingList.map(item => `
            <div class="shopping-item">
                <span>${item.name}</span>
                <button onclick="closet.removeShoppingItem(${item.id})">×</button>
            </div>
        `).join('');
    }

    // 渲染日历
    renderCalendar() {
        const calendar = document.getElementById('calendar');
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        
        let calendarHTML = `<div class="calendar-header">
            <h4>${year}年${month + 1}月</h4>
        </div>
        <div class="calendar-days">
            <div class="day-header">日</div>
            <div class="day-header">一</div>
            <div class="day-header">二</div>
            <div class="day-header">三</div>
            <div class="day-header">四</div>
            <div class="day-header">五</div>
            <div class="day-header">六</div>`;
        
        // 添加空白日期
        for (let i = 0; i < firstDay; i++) {
            calendarHTML += '<div class="calendar-day"></div>';
        }
        
        // 添加日期
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
            calendarHTML += `<div class="calendar-day ${isToday ? 'today' : ''}" data-date="${dateStr}">${day}</div>`;
        }
        
        calendarHTML += '</div>';
        calendar.innerHTML = calendarHTML;
        
        // 添加日期点击事件
        document.querySelectorAll('.calendar-day[data-date]').forEach(day => {
            day.addEventListener('click', (e) => {
                const date = e.target.dataset.date;
                this.showDailyOutfit(date);
            });
        });
    }

    // 显示当天搭配
    showDailyOutfit(date) {
        // 清除页面上所有的搭配显示
        const allOutfitSections = document.querySelectorAll('.daily-outfit-section');
        allOutfitSections.forEach(section => section.remove());
        
        // 获取当天的搭配
        const dailyOutfits = this.loadData('dailyOutfits', {});
        const outfit = dailyOutfits[date] || [];
        
        // 创建搭配显示界面
        const calendar = document.getElementById('calendar');
        let outfitHTML = '<div class="daily-outfit-section">';
        outfitHTML += `<h4>${date} 的搭配</h4>`;
        
        if (outfit.length > 0) {
            outfitHTML += '<div class="outfit-grid">';
            outfit.forEach(clothId => {
                const cloth = this.clothes.find(c => c.id === clothId);
                if (cloth) {
                    outfitHTML += `
                        <div class="clothes-card">
                            ${cloth.image ? `<img src="${cloth.image}" alt="${cloth.name}">` : `<div class="no-image">${cloth.name}</div>`}
                            <h4>${cloth.name}</h4>
                        </div>
                    `;
                }
            });
            outfitHTML += '</div>';
        } else {
            outfitHTML += '<p>当天没有搭配记录</p>';
        }
        
        // 添加操作按钮
        outfitHTML += `<div class="daily-outfit-actions">
            <button onclick="closet.switchToOutfitForDate('${date}')">设置今日搭配</button>`;
        
        // 如果当天有搭配，添加删除按钮
        if (outfit.length > 0) {
            outfitHTML += `<button onclick="closet.deleteDailyOutfit('${date}')" class="delete-daily-btn">删除搭配</button>`;
        }
        
        outfitHTML += `</div>`;
        outfitHTML += '</div>';
        
        // 添加新的搭配显示
        calendar.insertAdjacentHTML('afterend', outfitHTML);
    }

    // 切换到搭配页面并记住日期
    switchToOutfitForDate(date) {
        // 保存当前选择的日期
        this.selectedDateForOutfit = date;
        
        // 切换到搭配页面
        this.showTab('outfit');
        
        // 添加保存到特定日期的按钮
        this.addSaveToDateButton();
    }
    
    // 添加保存到特定日期的按钮
    addSaveToDateButton() {
        const outfitSection = document.querySelector('.outfit-section');
        const existingButton = outfitSection.querySelector('.save-to-date-btn');
        
        // 清除之前的按钮
        if (existingButton) {
            existingButton.remove();
        }
        
        // 添加新按钮
        const buttonHTML = `<button class="save-to-date-btn">保存到 ${this.selectedDateForOutfit}</button>`;
        const outfitButtons = outfitSection.querySelector('.outfit-buttons');
        outfitButtons.insertAdjacentHTML('beforeend', buttonHTML);
        
        // 添加点击事件
        document.querySelector('.save-to-date-btn').addEventListener('click', () => {
            this.saveOutfitToSelectedDate();
        });
    }
    
    // 保存搭配到选中的日期
    saveOutfitToSelectedDate() {
        if (!this.selectedDateForOutfit) {
            alert('请先从日历选择一个日期');
            return;
        }
        
        const outfitGrid = document.getElementById('outfitGrid');
        const outfit = JSON.parse(outfitGrid.dataset.outfit || '[]');
        
        if (outfit.length === 0) {
            alert('请先生成一套搭配');
            return;
        }
        
        // 检查当前搭配是否与已保存的搭配相同
        const dailyOutfits = this.loadData('dailyOutfits', {});
        const currentOutfitIds = outfit.map(cloth => cloth.id).sort();
        const existingOutfitIds = dailyOutfits[this.selectedDateForOutfit] || [];
        
        // 比较搭配是否相同
        if (JSON.stringify(currentOutfitIds) === JSON.stringify(existingOutfitIds.sort())) {
            alert('这套搭配已经保存在这一天了！');
            return;
        }
        
        // 保存当天的搭配
        dailyOutfits[this.selectedDateForOutfit] = currentOutfitIds;
        this.saveData('dailyOutfits', dailyOutfits);
        
        alert(`搭配已成功保存到 ${this.selectedDateForOutfit}`);
        
        // 可以选择返回到日历页面
        // this.showTab('tools');
    }
    
    // 设置当天搭配
    setDailyOutfit(date) {
        const outfitGrid = document.getElementById('outfitGrid');
        if (!outfitGrid) {
            alert('请先在搭配功能中生成或选择一套搭配');
            return;
        }
        
        const outfit = JSON.parse(outfitGrid.dataset.outfit || '[]');
        if (outfit.length === 0) {
            alert('请先生成一套搭配');
            return;
        }
        
        // 检查当前搭配是否与已保存的搭配相同
        const dailyOutfits = this.loadData('dailyOutfits', {});
        const currentOutfitIds = outfit.map(cloth => cloth.id).sort();
        const existingOutfitIds = dailyOutfits[date] || [];
        
        // 比较搭配是否相同
        if (JSON.stringify(currentOutfitIds) === JSON.stringify(existingOutfitIds.sort())) {
            alert('这套搭配已经保存在这一天了！');
            return;
        }
        
        // 保存当天的搭配
        dailyOutfits[date] = currentOutfitIds;
        this.saveData('dailyOutfits', dailyOutfits);
        
        alert(`搭配已设置到${date}`);
        this.showDailyOutfit(date);
    }
    
    // 删除当天的搭配
    deleteDailyOutfit(date) {
        if (!confirm('确定要删除这一天的搭配吗？')) {
            return;
        }
        
        const dailyOutfits = this.loadData('dailyOutfits', {});
        
        // 检查数据结构，如果是数组则清空整个数组
        if (Array.isArray(dailyOutfits[date])) {
            delete dailyOutfits[date];
        } else if (typeof dailyOutfits[date] === 'object') {
            // 如果是对象，也删除
            delete dailyOutfits[date];
        }
        
        this.saveData('dailyOutfits', dailyOutfits);
        
        // 清除页面上的所有搭配显示
        const existingSections = document.querySelectorAll('.daily-outfit-section');
        existingSections.forEach(section => section.remove());
        
        // 更新显示
        this.showDailyOutfit(date);
        alert('搭配已删除！');
    }
    
    // 检查并修复数据结构
    checkAndFixDataStructure() {
        const dailyOutfits = this.loadData('dailyOutfits', {});
        let hasFixed = false;
        
        for (const date in dailyOutfits) {
            if (Array.isArray(dailyOutfits[date])) {
                // 如果已经是正确的结构（单个搭配数组），跳过
                continue;
            } else if (typeof dailyOutfits[date] === 'object') {
                // 如果是对象，转换为正确的数组结构
                console.log('修复数据结构:', date);
                hasFixed = true;
                delete dailyOutfits[date];
            }
        }
        
        if (hasFixed) {
            this.saveData('dailyOutfits', dailyOutfits);
            console.log('数据结构已修复');
        }
    }
}

// 初始化应用
const closet = new SmartCloset();