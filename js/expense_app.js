// Wait for DOM to load
document.addEventListener("DOMContentLoaded", () => {
    // Validate if data is available
    if (typeof DASHBOARD_DATA === "undefined") {
        console.error("DASHBOARD_DATA is not loaded! Make sure dashboard_data.js is present.");
        return;
    }

    // Fix factory names and reorder
    DASHBOARD_DATA.forEach(f => {
        if (f.ShortName !== "KSP" && f.ShortName !== "Pilot" && f.ShortName !== "RD Center") {
            f.ShortName = "โรงงานผลิตซอส";
        }
    });

    const desiredOrder = ["RD Center", "Pilot", "โรงงานผลิตซอส", "KSP"];
    DASHBOARD_DATA.sort((a, b) => {
        let indexA = desiredOrder.indexOf(a.ShortName);
        let indexB = desiredOrder.indexOf(b.ShortName);
        if (indexA === -1) indexA = 999;
        if (indexB === -1) indexB = 999;
        return indexA - indexB;
    });

    // App State
    let currentTab = "overview"; // Default tab
    let searchQuery = "";
    let sortColumn = "Total";
    let sortDirection = "desc";
    let activeCharts = {};

    // Map month keys to Thai labels
    const MONTHS = [
        { key: "jan", label: "ม.ค." },
        { key: "feb", label: "ก.พ." },
        { key: "mar", label: "มี.ค." },
        { key: "apr", label: "เม.ย." },
        { key: "may", label: "พ.ค." },
        { key: "jun", label: "มิ.ย." },
        { key: "jul", label: "ก.ค." },
        { key: "aug", label: "ส.ค." },
        { key: "sep", label: "ก.ย." },
        { key: "oct", label: "ต.ค." },
        { key: "nov", label: "พ.ย." },
        { key: "dec", label: "ธ.ค." }
    ];

    // Initialize application
    init();

    function init() {
        setupThemeToggle();
        setupNavigation();
        setupSearch();
        renderDashboard();
    }

    // Theme Toggle Handler (Syncs with index.html toggle)
    function setupThemeToggle() {
        const toggle = document.getElementById("themeSwitch");
        const storedTheme = localStorage.getItem("team_todo_theme") || "dark";
        
        document.documentElement.setAttribute("data-theme", storedTheme);
        if (toggle) {
            toggle.checked = storedTheme === "dark";
            
            toggle.addEventListener("change", (e) => {
                const newTheme = e.target.checked ? "dark" : "light";
                document.documentElement.setAttribute("data-theme", newTheme);
                localStorage.setItem("team_todo_theme", newTheme);
                
                // Update other theme btn representation if any
                const headerThemeBtn = document.getElementById("themeBtn");
                if (headerThemeBtn) {
                    headerThemeBtn.textContent = newTheme === "dark" ? "☀️" : "🌙";
                }
                
                destroyAllCharts();
                renderCharts();
            });
        }
        
        // Also listen to the header theme button click if clicked
        const headerThemeBtn = document.getElementById("themeBtn");
        if (headerThemeBtn) {
            headerThemeBtn.addEventListener("click", () => {
                setTimeout(() => {
                    const currentTheme = document.documentElement.getAttribute("data-theme");
                    if (toggle) {
                        toggle.checked = currentTheme === "dark";
                    }
                    destroyAllCharts();
                    renderCharts();
                }, 50);
            });
        }
    }

    // Navigation Tabs Handler
    function setupNavigation() {
        const navItems = document.querySelectorAll(".nav-item");
        navItems.forEach(item => {
            item.addEventListener("click", (e) => {
                // Remove active class
                navItems.forEach(nav => nav.classList.remove("active"));
                
                // Add active class
                const target = e.currentTarget;
                target.classList.add("active");
                
                // Change tab
                currentTab = target.dataset.tab;
                
                // Reset search and sort
                searchQuery = "";
                const searchInput = document.getElementById("tableSearch");
                if (searchInput) searchInput.value = "";
                sortColumn = "Total";
                sortDirection = "desc";

                // Show/hide UI sections based on tab
                updateTabVisibility();
                
                // Render dashboard
                renderDashboard();
            });
        });
    }

    function updateTabVisibility() {
        const panes = document.querySelectorAll(".tab-pane");
        panes.forEach(pane => {
            if (pane.id === `${currentTab}Pane` || (currentTab !== "overview" && currentTab !== "advances" && currentTab !== "tasks" && pane.id === "factoryPane")) {
                pane.classList.add("active");
                pane.style.display = "flex"; // style override
            } else {
                pane.classList.remove("active");
                pane.style.display = "none";
            }
        });

        // Update header elements visibility based on tab
        const dateBadge = document.getElementById("header-date-badge");
        const roleSelector = document.getElementById("header-role-selector");
        const headerTitle = document.querySelector(".header-title h1");
        const subtitle = document.querySelector(".header-title p");

        if (currentTab === "tasks") {
            if (dateBadge) dateBadge.style.display = "none";
            if (roleSelector) roleSelector.style.display = "flex";
            if (headerTitle) headerTitle.innerText = "บอร์ดติดตามงานของทีม (Team Tasks)";
            if (subtitle) subtitle.innerText = "จัดการบอร์ดงานแบบคัมบัง และติดตามความคืบหน้าของพนักงานรายบุคคล";
        } else {
            if (dateBadge) dateBadge.style.display = "block";
            if (roleSelector) roleSelector.style.display = "none";
            if (headerTitle) headerTitle.innerText = "Interactive Expense Dashboard";
            
            if (currentTab === "overview") {
                if (subtitle) subtitle.innerText = "สรุปภาพรวมค่าใช้จ่ายทุกโรงงาน ประจำปี 2569 (ม.ค. - พ.ค.)";
            } else if (currentTab === "advances") {
                if (subtitle) subtitle.innerText = "รายงานเงินยืมทดรองจ่ายทุกโรงงาน ประจำปี 2569";
            } else {
                const factory = getFactoryData(currentTab);
                if (subtitle) subtitle.innerText = `${factory ? factory.FactoryName : ""} ประจำปี 2569 (ม.ค. - พ.ค.)`;
            }
        }
    }

    // Search Input Setup
    function setupSearch() {
        const searchInput = document.getElementById("tableSearch");
        if (searchInput) {
            searchInput.addEventListener("input", (e) => {
                searchQuery = e.target.value.toLowerCase().trim();
                renderTables();
            });
        }
    }

    // Helper: Find factory data by key/shortName
    function getFactoryData(key) {
        return DASHBOARD_DATA.find(f => f.ShortName.toLowerCase() === key.toLowerCase());
    }

    // Destroy all existing charts
    function destroyAllCharts() {
        Object.keys(activeCharts).forEach(key => {
            if (activeCharts[key]) {
                activeCharts[key].destroy();
                activeCharts[key] = null;
            }
        });
        activeCharts = {};
    }

    // Main render router
    function renderDashboard() {
        if (currentTab === "tasks") {
            // Task board rendering is handled by its own script js/app.js
            return;
        }
        destroyAllCharts();
        renderKPIs();
        renderCharts();
        renderTables();
    }

    // Calculate aggregated and specific stats
    function calculateStats(factoryKey = "all") {
        let totalCost = 0;
        let fixedCost = 0;
        let variableCost = 0;
        let totalAdvance = 0;
        
        let itemCount = 0;
        let highestCostItem = { name: "-", amount: 0 };
        let allItems = []; // For top 10 and trends
        
        let factoriesToProcess = [];
        if (factoryKey === "all") {
            factoriesToProcess = DASHBOARD_DATA;
        } else {
            const f = getFactoryData(factoryKey);
            if (f) factoriesToProcess = [f];
        }

        factoriesToProcess.forEach(fact => {
            // Main Items
            fact.MainItems.forEach(item => {
                if (item.Total === 0 && !item.IsLodni) return;
                
                const itemTotal = item.Total;
                totalCost += itemTotal;
                itemCount++;
                
                if (itemTotal > highestCostItem.amount) {
                    highestCostItem = { name: item.Item, amount: itemTotal };
                }
                
                allItems.push({
                    Item: item.Item,
                    Type: item.Type || "ทั่วไป",
                    Total: itemTotal,
                    Months: item.Months,
                    factory: fact.ShortName
                });
                
                // Categories
                const type = (item.Type || "").toLowerCase();
                if (type.includes("คงที่")) {
                    fixedCost += itemTotal;
                } else if (type.includes("แปรผัน")) {
                    variableCost += itemTotal;
                }
            });

            // Advance Items
            fact.AdvanceItems.forEach(item => {
                totalAdvance += item.Total;
                itemCount++;
                
                if (item.Total > highestCostItem.amount) {
                    highestCostItem = { name: `เงินยืม: ${item.Activity}`, amount: item.Total };
                }
                
                allItems.push({
                    Item: `เงินยืม: ${item.Activity}`,
                    Type: "เงินยืมทดรอง",
                    Total: item.Total,
                    Months: item.Months,
                    factory: fact.ShortName
                });
            });
        });

        const otherCost = Math.max(0, totalCost - (fixedCost + variableCost));
        const grandTotal = totalCost + totalAdvance;

        return {
            totalCost,
            fixedCost,
            variableCost,
            otherCost,
            totalAdvance,
            grandTotal,
            itemCount,
            highestCostItem,
            allItems
        };
    }

    // Render KPI Cards
    function renderKPIs() {
        const stats = calculateStats((currentTab === "overview" || currentTab === "advances") ? "all" : currentTab);
        
        let suffix = currentTab === "overview" ? "O" : (currentTab === "advances" ? "A" : "F");
        
        const totalCostEl = document.getElementById(`totalCostVal${suffix}`);
        const fixedCostEl = document.getElementById(`fixedCostVal${suffix}`);
        const variableCostEl = document.getElementById(`variableCostVal${suffix}`);
        const advanceEl = document.getElementById(`advanceVal${suffix}`);
        const itemCountEl = document.getElementById(`itemCountVal${suffix}`);
        const highestCostEl = document.getElementById(`highestCostVal${suffix}`);
        
        if (totalCostEl) totalCostEl.innerText = formatNumber(stats.totalCost) + " บาท";
        if (fixedCostEl) fixedCostEl.innerText = formatNumber(stats.fixedCost) + " บาท";
        if (variableCostEl) variableCostEl.innerText = formatNumber(stats.variableCost) + " บาท";
        if (advanceEl) advanceEl.innerText = formatNumber(stats.totalAdvance) + " บาท";
        
        if (itemCountEl) itemCountEl.innerText = stats.itemCount + " รายการ";
        if (highestCostEl) highestCostEl.innerHTML = `<strong>${formatCompactNumber(stats.highestCostItem.amount)} บาท</strong><br><span style="font-size:0.75rem; color:var(--text-secondary); font-weight:normal;">${stats.highestCostItem.name}</span>`;
    }

    // Chart Rendering
    function renderCharts() {
        const isDark = document.documentElement.getAttribute("data-theme") === "dark";
        const textColor = isDark ? "#94a3b8" : "#64748b";
        const gridColor = isDark ? "rgba(31, 41, 55, 0.4)" : "rgba(226, 232, 240, 0.8)";
        
        if (currentTab === "overview") {
            renderOverviewCharts(textColor, gridColor);
        } else if (currentTab === "advances") {
            renderAdvancesCharts(textColor, gridColor);
        } else {
            renderFactoryCharts(textColor, gridColor);
        }
    }

    // 1. Overview Charts
    function renderOverviewCharts(textColor, gridColor) {
        const factoryLabels = DASHBOARD_DATA.map(f => f.ShortName);
        const factoryTotals = DASHBOARD_DATA.map(f => {
            return f.MainItems.reduce((sum, item) => sum + item.Total, 0);
        });

        const barOptions = {
            chart: {
                type: 'bar',
                height: 320,
                fontFamily: 'Outfit, Sarabun, sans-serif',
                toolbar: { show: false }
            },
            colors: ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b'],
            plotOptions: {
                bar: {
                    columnWidth: '45%',
                    distributed: true,
                    borderRadius: 8,
                    dataLabels: { position: 'top' }
                }
            },
            dataLabels: {
                enabled: true,
                formatter: (val) => formatCompactNumber(val),
                offsetY: -20,
                style: {
                    fontSize: '11px',
                    colors: [textColor]
                }
            },
            series: [{
                name: 'ค่าใช้จ่ายรวม',
                data: factoryTotals
            }],
            xaxis: {
                categories: factoryLabels,
                labels: { style: { colors: textColor } }
            },
            yaxis: {
                labels: {
                    style: { colors: textColor },
                    formatter: (val) => formatCompactNumber(val)
                }
            },
            grid: { borderColor: gridColor },
            tooltip: {
                y: { formatter: (val) => formatNumber(val) + " บาท" }
            },
            legend: { show: false }
        };

        const chartElement = document.querySelector("#overviewChart1");
        if (chartElement) {
            const chart1 = new ApexCharts(chartElement, barOptions);
            chart1.render();
            activeCharts["overviewChart1"] = chart1;
        }

        const isDark = document.documentElement.getAttribute("data-theme") === "dark";
const stats = calculateStats("all");
        const donutOptions = {
            chart: {
                type: 'donut',
                height: 320,
                fontFamily: 'Outfit, Sarabun, sans-serif'
            },
            labels: ['คงที่ตามสัญญา (Fixed)', 'แปรผันตามการใช้งาน (Variable)', 'เงินยืมทดรองจ่าย (Advances)', 'ค่าใช้จ่ายอื่น ๆ (Others)'],
            series: [stats.fixedCost, stats.variableCost, stats.totalAdvance, stats.otherCost],
            colors: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'],
            legend: {
                position: 'bottom',
                labels: { colors: textColor }
            },
            dataLabels: { enabled: true, formatter: (val) => val.toFixed(1) + "%" },
            plotOptions: {
                pie: {
                    donut: {
                        size: '65%',
                        labels: {
                            show: true,
                            name: { show: true, fontSize: '13px', color: textColor },
                            value: {
                                show: true,
                                fontSize: '20px',
                                fontWeight: 700,
                                color: isDark ? '#f1f5f9' : '#1e293b',
                                formatter: (val) => formatCompactNumber(val)
                            },
                            total: {
                                show: true,
                                label: 'รวมทั้งสิ้น',
                                color: textColor,
                                formatter: () => formatCompactNumber(stats.grandTotal)
                            }
                        }
                    }
                }
            },
            tooltip: {
                y: { formatter: (val) => formatNumber(val) + " บาท" }
            }
        };

        const chartElement2 = document.querySelector("#overviewChart2");
        if (chartElement2) {
            const chart2 = new ApexCharts(chartElement2, donutOptions);
            chart2.render();
            activeCharts["overviewChart2"] = chart2;
        }

        renderTop10Chart("#overviewTop10Chart", stats.allItems, textColor, gridColor);
        renderTrendChart("#overviewTrendChart", stats.allItems, textColor, gridColor);
        renderMomAlerts("#overviewMomAlerts", stats.allItems);
    }

    // 2. Factory-Specific Charts
    function renderFactoryCharts(textColor, gridColor) {
        const factory = getFactoryData(currentTab);
        if (!factory) return;

        const monthlyData = Array(5).fill(0);
        factory.MainItems.forEach(item => {
            monthlyData[0] += item.Months.jan;
            monthlyData[1] += item.Months.feb;
            monthlyData[2] += item.Months.mar;
            monthlyData[3] += item.Months.apr;
            monthlyData[4] += item.Months.may;
        });

        const lineOptions = {
            chart: {
                type: 'area',
                height: 320,
                fontFamily: 'Outfit, Sarabun, sans-serif',
                toolbar: { show: false }
            },
            series: [{
                name: 'ค่าใช้จ่ายรายเดือน',
                data: monthlyData
            }],
            colors: ['#3b82f6'],
            fill: {
                type: 'gradient',
                gradient: {
                    shadeIntensity: 1,
                    opacityFrom: 0.45,
                    opacityTo: 0.05,
                    stops: [0, 90, 100]
                }
            },
            stroke: { curve: 'smooth', width: 3 },
            xaxis: {
                categories: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.'],
                labels: { style: { colors: textColor } }
            },
            yaxis: {
                labels: {
                    style: { colors: textColor },
                    formatter: (val) => formatCompactNumber(val)
                }
            },
            grid: { borderColor: gridColor },
            dataLabels: { enabled: false },
            tooltip: {
                y: { formatter: (val) => formatNumber(val) + " บาท" }
            }
        };

        const chartElement = document.querySelector("#factoryChart1");
        if (chartElement) {
            const chart1 = new ApexCharts(chartElement, lineOptions);
            chart1.render();
            activeCharts["factoryChart1"] = chart1;
        }

        const stats = calculateStats(currentTab);
        const pieOptions = {
            chart: {
                type: 'pie',
                height: 320,
                fontFamily: 'Outfit, Sarabun, sans-serif'
            },
            labels: ['คงที่ตามสัญญา', 'แปรผันตามการใช้งาน', 'เงินยืมทดรองจ่าย', 'อื่น ๆ'],
            series: [stats.fixedCost, stats.variableCost, stats.totalAdvance, stats.otherCost],
            colors: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'],
            legend: {
                position: 'bottom',
                labels: { colors: textColor }
            },
            dataLabels: { enabled: true, formatter: (val) => val.toFixed(1) + "%" },
            tooltip: {
                y: { formatter: (val) => formatNumber(val) + " บาท" }
            }
        };

        const chartElement2 = document.querySelector("#factoryChart2");
        if (chartElement2) {
            const chart2 = new ApexCharts(chartElement2, pieOptions);
            chart2.render();
            activeCharts["factoryChart2"] = chart2;
        }

        renderTop10Chart("#factoryTop10Chart", stats.allItems, textColor, gridColor);
        renderTrendChart("#factoryTrendChart", stats.allItems, textColor, gridColor);
        renderMomAlerts("#factoryMomAlerts", stats.allItems);
    }

    // --- Helper: Render Top 10 Horizontal Bar Chart ---
    function renderTop10Chart(containerId, items, textColor, gridColor) {
        const el = document.querySelector(containerId);
        if (!el) return;
        
        let top10 = [...items].sort((a,b) => b.Total - a.Total).slice(0, 10);
        
        const options = {
            chart: { type: 'bar', height: 320, fontFamily: 'Outfit, Sarabun, sans-serif', toolbar: { show: false } },
            plotOptions: { bar: { horizontal: true, borderRadius: 4, dataLabels: { position: 'bottom' } } },
            colors: ['#f59e0b'],
            dataLabels: {
                enabled: true,
                textAnchor: 'start',
                style: { colors: ['#fff'] },
                formatter: function (val, opt) {
                    return formatNumber(val);
                },
                offsetX: 0,
            },
            series: [{ name: 'ค่าใช้จ่าย', data: top10.map(i => i.Total || 0) }],
            xaxis: {
                categories: top10.map(i => {
                    let name = i.Item || "ไม่ระบุรายการ";
                    if(i.factory && currentTab === "overview") name = `[${i.factory}] ${name}`;
                    return name.substring(0, 30) + (name.length > 30 ? '...' : '');
                }),
                labels: { formatter: (val) => formatCompactNumber(val), style: { colors: textColor } }
            },
            yaxis: { labels: { style: { colors: textColor, fontSize: '11px' } } },
            grid: { borderColor: gridColor },
            tooltip: { y: { formatter: (val) => formatNumber(val) + " บาท" } }
        };
        const chart = new ApexCharts(el, options);
        chart.render();
        activeCharts[containerId.replace('#','')] = chart;
    }

    // --- Helper: Render Top 5 Trend Chart ---
    function renderTrendChart(containerId, items, textColor, gridColor) {
        const el = document.querySelector(containerId);
        if (!el) return;

        let top5 = [...items].sort((a,b) => b.Total - a.Total).slice(0, 5);
        
        let seriesData = top5.map(item => {
            let name = item.Item || "ไม่ระบุรายการ";
            if(item.factory && currentTab === "overview") name = `[${item.factory}] ${name}`;
            return {
                name: name.substring(0, 20) + (name.length > 20 ? '...' : ''),
                data: [
                    item.Months?.jan || 0,
                    item.Months?.feb || 0,
                    item.Months?.mar || 0,
                    item.Months?.apr || 0,
                    item.Months?.may || 0
                ]
            };
        });

        const options = {
            chart: { type: 'line', height: 320, fontFamily: 'Outfit, Sarabun, sans-serif', toolbar: { show: false } },
            stroke: { curve: 'smooth', width: 3 },
            series: seriesData,
            xaxis: { categories: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.'], labels: { style: { colors: textColor } } },
            yaxis: { labels: { formatter: (val) => formatCompactNumber(val), style: { colors: textColor } } },
            grid: { borderColor: gridColor },
            legend: { position: 'bottom', labels: { colors: textColor } },
            tooltip: { y: { formatter: (val) => formatNumber(val) + " บาท" } }
        };
        const chart = new ApexCharts(el, options);
        chart.render();
        activeCharts[containerId.replace('#','')] = chart;
    }

    // --- Helper: Render MoM Jumpers ---
    function renderMomAlerts(containerId, items) {
        const container = document.querySelector(containerId);
        if (!container) return;
        container.innerHTML = "";
        
        let jumpers = [];
        items.forEach(item => {
            let apr = item.Months?.apr || 0;
            let may = item.Months?.may || 0;
            if (may > 5000 && may > apr * 1.2) {
                let increase = may - apr;
                let pct = apr > 0 ? ((may - apr) / apr * 100).toFixed(1) : "100+";
                let name = item.Item || "ไม่ระบุรายการ";
                if(item.factory && currentTab === "overview") name = `[${item.factory}] ${name}`;
                jumpers.push({ item: name, apr, may, increase, pct });
            }
        });
        
        jumpers.sort((a,b) => b.increase - a.increase);
        let topJumpers = jumpers.slice(0, 3);
        
        if (topJumpers.length > 0) {
            let html = `<h3 style="font-size:1.1rem; margin-bottom:1rem; display:flex; align-items:center; gap:0.5rem;"><i class="fas fa-exclamation-triangle text-danger" style="color:#ef4444;"></i> ข้อสังเกต: รายการที่ค่าใช้จ่ายเพิ่มสูงขึ้น (พ.ค. เทียบ เม.ย.)</h3>`;
            topJumpers.forEach(j => {
                html += `
                <div class="alert-box">
                    <div class="alert-icon"><i class="fas fa-arrow-trend-up"></i></div>
                    <div class="alert-content">
                        <h4>${j.item}</h4>
                        <p>พ.ค. จ่าย <strong>${formatNumber(j.may)} บาท</strong> (เพิ่มขึ้น ${formatNumber(j.increase)} บาท หรือ <span style="color:#ef4444; font-weight:bold;">+${j.pct}%</span> จาก เม.ย.)</p>
                    </div>
                </div>`;
            });
            container.innerHTML = html;
        }
    }

    // 3. Advances Charts
    function renderAdvancesCharts(textColor, gridColor) {
        const factoryLabels = DASHBOARD_DATA.map(f => f.ShortName);
        const factoryAdvances = DASHBOARD_DATA.map(f => {
            return f.AdvanceItems.reduce((sum, item) => sum + item.Total, 0);
        });

        const barOptions = {
            chart: {
                type: 'bar',
                height: 320,
                fontFamily: 'Outfit, Sarabun, sans-serif',
                toolbar: { show: false }
            },
            colors: ['#8b5cf6'],
            plotOptions: {
                bar: {
                    columnWidth: '40%',
                    borderRadius: 8,
                    dataLabels: { position: 'top' }
                }
            },
            series: [{
                name: 'เงินยืมทดรองจ่ายสะสม',
                data: factoryAdvances
            }],
            xaxis: {
                categories: factoryLabels,
                labels: { style: { colors: textColor } }
            },
            yaxis: {
                labels: {
                    style: { colors: textColor },
                    formatter: (val) => formatCompactNumber(val)
                }
            },
            grid: { borderColor: gridColor },
            dataLabels: {
                enabled: true,
                formatter: (val) => formatCompactNumber(val),
                offsetY: -20,
                style: { colors: [textColor] }
            },
            tooltip: {
                y: { formatter: (val) => formatNumber(val) + " บาท" }
            }
        };

        const chartElement = document.querySelector("#advancesChart1");
        if (chartElement) {
            const chart1 = new ApexCharts(chartElement, barOptions);
            chart1.render();
            activeCharts["advancesChart1"] = chart1;
        }

        const monthlyAdvance = Array(5).fill(0);
        DASHBOARD_DATA.forEach(f => {
            f.AdvanceItems.forEach(item => {
                monthlyAdvance[0] += item.Months.jan;
                monthlyAdvance[1] += item.Months.feb;
                monthlyAdvance[2] += item.Months.mar;
                monthlyAdvance[3] += item.Months.apr;
                monthlyAdvance[4] += item.Months.may;
            });
        });

        const lineOptions = {
            chart: {
                type: 'area',
                height: 320,
                fontFamily: 'Outfit, Sarabun, sans-serif',
                toolbar: { show: false }
            },
            series: [{
                name: 'เงินยืมรายเดือน',
                data: monthlyAdvance
            }],
            colors: ['#8b5cf6'],
            fill: {
                type: 'gradient',
                gradient: {
                    shadeIntensity: 1,
                    opacityFrom: 0.45,
                    opacityTo: 0.05,
                    stops: [0, 90, 100]
                }
            },
            stroke: { curve: 'smooth', width: 3 },
            xaxis: {
                categories: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.'],
                labels: { style: { colors: textColor } }
            },
            yaxis: {
                labels: {
                    style: { colors: textColor },
                    formatter: (val) => formatCompactNumber(val)
                }
            },
            grid: { borderColor: gridColor },
            dataLabels: { enabled: false },
            tooltip: {
                y: { formatter: (val) => formatNumber(val) + " บาท" }
            }
        };

        const chartElement2 = document.querySelector("#advancesChart2");
        if (chartElement2) {
            const chart2 = new ApexCharts(chartElement2, lineOptions);
            chart2.render();
            activeCharts["advancesChart2"] = chart2;
        }
    }

    // Tables Rendering
    function renderTables() {
        if (currentTab === "overview") {
            renderOverviewTable();
        } else if (currentTab === "advances") {
            renderAdvancesTable();
        } else {
            renderFactoryTables();
        }
    }

    // 1. Render Overview Page Table (Consolidated list of factories)
    function renderOverviewTable() {
        const tableBody = document.querySelector("#overviewTable tbody");
        if (!tableBody) return;
        
        tableBody.innerHTML = "";
        
        let grandTotal = 0;
        let grandFixed = 0;
        let grandVariable = 0;
        let grandOther = 0;
        let grandAdvance = 0;
        
        DASHBOARD_DATA.forEach((f, idx) => {
            const stats = calculateStats(f.ShortName);
            
            grandTotal += stats.totalCost;
            grandFixed += stats.fixedCost;
            grandVariable += stats.variableCost;
            grandOther += stats.otherCost;
            grandAdvance += stats.totalAdvance;
            
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td class="text-center">${idx + 1}</td>
                <td><span class="text-bold">${f.FactoryName}</span></td>
                <td class="text-right text-bold text-blue">${formatNumber(stats.totalCost)}</td>
                <td class="text-right">${formatNumber(stats.fixedCost)}</td>
                <td class="text-right">${formatNumber(stats.variableCost)}</td>
                <td class="text-right">${formatNumber(stats.otherCost)}</td>
                <td class="text-right text-purple">${formatNumber(stats.totalAdvance)}</td>
                <td class="text-center">
                    <button class="btn btn-sm view-fact-btn" data-tab="${f.ShortName.toLowerCase()}">
                        <i class="fas fa-eye"></i> ดูรายละเอียด
                    </button>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        // Add Grand Total Row
        const trTotal = document.createElement("tr");
        trTotal.className = "row-total";
        trTotal.innerHTML = `
            <td></td>
            <td>รวมทั้งสิ้น (Grand Total)</td>
            <td class="text-right">${formatNumber(grandTotal)}</td>
            <td class="text-right">${formatNumber(grandFixed)}</td>
            <td class="text-right">${formatNumber(grandVariable)}</td>
            <td class="text-right">${formatNumber(grandOther)}</td>
            <td class="text-right">${formatNumber(grandAdvance)}</td>
            <td></td>
        `;
        tableBody.appendChild(trTotal);

        // Bind clicks to "View details" buttons
        document.querySelectorAll(".view-fact-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const targetTab = e.currentTarget.dataset.tab;
                const navItem = document.querySelector(`.nav-item[data-tab="${targetTab}"]`);
                if (navItem) navItem.click();
            });
        });
    }

    // 2. Render Factory Details tables
    function renderFactoryTables() {
        const factory = getFactoryData(currentTab);
        if (!factory) return;

        renderFactoryMainTable(factory);
        renderFactoryAdvanceTable(factory);
    }

    function renderFactoryMainTable(factory) {
        const tableBody = document.querySelector("#factoryMainTable tbody");
        if (!tableBody) return;
        tableBody.innerHTML = "";

        let filteredItems = factory.MainItems.filter(item => {
            return item.Item.toLowerCase().includes(searchQuery) || 
                   (item.Type || "").toLowerCase().includes(searchQuery);
        });

        filteredItems.sort((a, b) => {
            let valA = getSortValue(a, sortColumn);
            let valB = getSortValue(b, sortColumn);
            
            if (valA < valB) return sortDirection === "asc" ? -1 : 1;
            if (valA > valB) return sortDirection === "asc" ? 1 : -1;
            return 0;
        });

        if (filteredItems.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="10" class="text-center">
                        <div class="empty-state">
                            <i class="fas fa-search"></i>
                            <h3>ไม่พบข้อมูลค่าใช้จ่าย</h3>
                            <p>ลองค้นหาด้วยคำอื่น</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        let colSums = { jan: 0, feb: 0, mar: 0, apr: 0, may: 0, total: 0 };

        filteredItems.forEach(item => {
            colSums.jan += item.Months.jan;
            colSums.feb += item.Months.feb;
            colSums.mar += item.Months.mar;
            colSums.apr += item.Months.apr;
            colSums.may += item.Months.may;
            colSums.total += item.Total;

            const tr = document.createElement("tr");
            if (item.IsLodni) tr.className = "row-lodni";

            let badgeClass = "badge-other";
            const type = (item.Type || "").toLowerCase();
            if (type.includes("คงที่")) badgeClass = "badge-fixed";
            else if (type.includes("แปรผัน")) badgeClass = "badge-variable";
            else if (item.IsLodni) badgeClass = "badge-neg";

            tr.innerHTML = `
                <td class="text-center">${item.No || ""}</td>
                <td><span class="${item.IsLodni ? '' : 'text-bold'}">${item.Item}</span></td>
                <td><span class="badge ${badgeClass}">${item.Type || "ทั่วไป"}</span></td>
                <td class="text-right">${formatCellNumber(item.Months.jan)}</td>
                <td class="text-right">${formatCellNumber(item.Months.feb)}</td>
                <td class="text-right">${formatCellNumber(item.Months.mar)}</td>
                <td class="text-right">${formatCellNumber(item.Months.apr)}</td>
                <td class="text-right">${formatCellNumber(item.Months.may)}</td>
                <td class="text-right text-bold ${item.IsLodni ? 'text-danger' : ''}">${formatNumber(item.Total)}</td>
            `;
            tableBody.appendChild(tr);
        });

        const trTotal = document.createElement("tr");
        trTotal.className = "row-total";
        trTotal.innerHTML = `
            <td></td>
            <td>รวม (Total)</td>
            <td></td>
            <td class="text-right">${formatNumber(colSums.jan)}</td>
            <td class="text-right">${formatNumber(colSums.feb)}</td>
            <td class="text-right">${formatNumber(colSums.mar)}</td>
            <td class="text-right">${formatNumber(colSums.apr)}</td>
            <td class="text-right">${formatNumber(colSums.may)}</td>
            <td class="text-right">${formatNumber(colSums.total)}</td>
        `;
        tableBody.appendChild(trTotal);
    }

    function renderFactoryAdvanceTable(factory) {
        const advSection = document.getElementById("factoryAdvanceSection");
        if (!advSection) return;

        if (factory.AdvanceItems.length === 0) {
            advSection.style.display = "none";
            return;
        }

        advSection.style.display = "block";
        const tableBody = document.querySelector("#factoryAdvanceTable tbody");
        if (!tableBody) return;
        tableBody.innerHTML = "";

        const borrowerSummaryMap = {};
        let colSums = { jan: 0, feb: 0, mar: 0, apr: 0, may: 0, total: 0 };

        factory.AdvanceItems.forEach(item => {
            colSums.jan += item.Months.jan;
            colSums.feb += item.Months.feb;
            colSums.mar += item.Months.mar;
            colSums.apr += item.Months.apr;
            colSums.may += item.Months.may;
            colSums.total += item.Total;

            const borrower = item.Borrower || "ไม่ระบุชื่อ";
            if (!borrowerSummaryMap[borrower]) {
                borrowerSummaryMap[borrower] = { count: 0, total: 0 };
            }
            borrowerSummaryMap[borrower].count++;
            borrowerSummaryMap[borrower].total += item.Total;

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td class="text-center">${item.No || ""}</td>
                <td><span class="text-bold">${item.Activity}</span></td>
                <td>${item.Borrower}</td>
                <td class="text-right">${formatCellNumber(item.Months.jan)}</td>
                <td class="text-right">${formatCellNumber(item.Months.feb)}</td>
                <td class="text-right">${formatCellNumber(item.Months.mar)}</td>
                <td class="text-right">${formatCellNumber(item.Months.apr)}</td>
                <td class="text-right">${formatCellNumber(item.Months.may)}</td>
                <td class="text-right text-bold">${formatNumber(item.Total)}</td>
            `;
            tableBody.appendChild(tr);
        });

        const trTotal = document.createElement("tr");
        trTotal.className = "row-total";
        trTotal.innerHTML = `
            <td></td>
            <td>รวมเงินยืมทดรองจ่าย</td>
            <td></td>
            <td class="text-right">${formatNumber(colSums.jan)}</td>
            <td class="text-right">${formatNumber(colSums.feb)}</td>
            <td class="text-right">${formatNumber(colSums.mar)}</td>
            <td class="text-right">${formatNumber(colSums.apr)}</td>
            <td class="text-right">${formatNumber(colSums.may)}</td>
            <td class="text-right">${formatNumber(colSums.total)}</td>
        `;
        tableBody.appendChild(trTotal);

        renderBorrowerSummary(borrowerSummaryMap);
    }

    function renderBorrowerSummary(summaryMap) {
        const grid = document.querySelector("#borrowerGrid");
        if (!grid) return;
        grid.innerHTML = "";

        Object.keys(summaryMap).forEach(name => {
            const data = summaryMap[name];
            const card = document.createElement("div");
            card.className = "borrower-card";
            card.innerHTML = `
                <div class="borrower-profile">
                    <div class="borrower-avatar">${name.substring(0, 2)}</div>
                    <div class="borrower-info">
                        <h4>${name}</h4>
                        <p>ผู้ยืมเงินทดรองจ่าย</p>
                    </div>
                </div>
                <div class="borrower-stats">
                    <div>
                        <div class="borrower-stat-val text-bold text-purple">${data.count}</div>
                        <div class="borrower-stat-label">ครั้งที่ยืม</div>
                    </div>
                    <div>
                        <div class="borrower-stat-val text-bold text-blue">${formatNumber(data.total)}</div>
                        <div class="borrower-stat-label">จำนวนเงินรวม (บาท)</div>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    // 3. Render Consolidated Advances tab page
    function renderAdvancesTable() {
        const tableBody = document.querySelector("#advancesTable tbody");
        if (!tableBody) return;
        tableBody.innerHTML = "";

        let allAdvances = [];
        let borrowerSummaryMap = {};

        DASHBOARD_DATA.forEach(f => {
            f.AdvanceItems.forEach(item => {
                allAdvances.push({
                    factory: f.ShortName,
                    factoryFullName: f.FactoryName,
                    ...item
                });

                const borrower = item.Borrower || "ไม่ระบุชื่อ";
                if (!borrowerSummaryMap[borrower]) {
                    borrowerSummaryMap[borrower] = { count: 0, total: 0 };
                }
                borrowerSummaryMap[borrower].count++;
                borrowerSummaryMap[borrower].total += item.Total;
            });
        });

        let filtered = allAdvances.filter(item => {
            return item.Activity.toLowerCase().includes(searchQuery) ||
                   item.Borrower.toLowerCase().includes(searchQuery) ||
                   item.factoryFullName.toLowerCase().includes(searchQuery);
        });

        if (filtered.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="10" class="text-center">
                        <div class="empty-state">
                            <i class="fas fa-search"></i>
                            <h3>ไม่พบข้อมูลการยืมเงิน</h3>
                            <p>ลองค้นหาด้วยคำอื่น</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        let colSums = { jan: 0, feb: 0, mar: 0, apr: 0, may: 0, total: 0 };

        filtered.forEach((item, idx) => {
            colSums.jan += item.Months.jan;
            colSums.feb += item.Months.feb;
            colSums.mar += item.Months.mar;
            colSums.apr += item.Months.apr;
            colSums.may += item.Months.may;
            colSums.total += item.Total;

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td class="text-center">${idx + 1}</td>
                <td><span class="badge badge-other">${item.factory}</span></td>
                <td><span class="text-bold">${item.Activity}</span></td>
                <td>${item.Borrower}</td>
                <td class="text-right">${formatCellNumber(item.Months.jan)}</td>
                <td class="text-right">${formatCellNumber(item.Months.feb)}</td>
                <td class="text-right">${formatCellNumber(item.Months.mar)}</td>
                <td class="text-right">${formatCellNumber(item.Months.apr)}</td>
                <td class="text-right">${formatCellNumber(item.Months.may)}</td>
                <td class="text-right text-bold text-purple">${formatNumber(item.Total)}</td>
            `;
            tableBody.appendChild(tr);
        });

        const trTotal = document.createElement("tr");
        trTotal.className = "row-total";
        trTotal.innerHTML = `
            <td></td>
            <td>รวมทั้งสิ้น</td>
            <td></td>
            <td></td>
            <td class="text-right">${formatNumber(colSums.jan)}</td>
            <td class="text-right">${formatNumber(colSums.feb)}</td>
            <td class="text-right">${formatNumber(colSums.mar)}</td>
            <td class="text-right">${formatNumber(colSums.apr)}</td>
            <td class="text-right">${formatNumber(colSums.may)}</td>
            <td class="text-right text-purple">${formatNumber(colSums.total)}</td>
        `;
        tableBody.appendChild(trTotal);

        renderGlobalBorrowerSummary(borrowerSummaryMap);
    }

    function renderGlobalBorrowerSummary(summaryMap) {
        const grid = document.querySelector("#globalBorrowerGrid");
        if (!grid) return;
        grid.innerHTML = "";

        Object.keys(summaryMap).forEach(name => {
            const data = summaryMap[name];
            const card = document.createElement("div");
            card.className = "borrower-card";
            card.innerHTML = `
                <div class="borrower-profile">
                    <div class="borrower-avatar">${name.substring(0, 2)}</div>
                    <div class="borrower-info">
                        <h4>${name}</h4>
                        <p>ผู้ยืมเงินทดรองจ่ายสะสม</p>
                    </div>
                </div>
                <div class="borrower-stats">
                    <div>
                        <div class="borrower-stat-val text-bold text-purple">${data.count}</div>
                        <div class="borrower-stat-label">ครั้งที่ยืมทั้งหมด</div>
                    </div>
                    <div>
                        <div class="borrower-stat-val text-bold text-blue">${formatNumber(data.total)}</div>
                        <div class="borrower-stat-label">จำนวนเงินสะสม (บาท)</div>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    // Helper: Sort mapping values
    function getSortValue(item, col) {
        if (col === "Item") return item.Item;
        if (col === "Type") return item.Type || "";
        if (col === "Total") return item.Total;
        if (col === "jan") return item.Months.jan;
        if (col === "feb") return item.Months.feb;
        if (col === "mar") return item.Months.mar;
        if (col === "apr") return item.Months.apr;
        if (col === "may") return item.Months.may;
        return 0;
    }

    // Expose sort function globally
    window.handleSort = function(column) {
        if (sortColumn === column) {
            sortDirection = sortDirection === "asc" ? "desc" : "asc";
        } else {
            sortColumn = column;
            sortDirection = "desc";
        }

        const headers = document.querySelectorAll("#factoryMainTable th");
        headers.forEach(h => {
            h.classList.remove("sort-asc", "sort-desc");
            if (h.dataset.sort === column) {
                h.classList.add(sortDirection === "asc" ? "sort-asc" : "sort-desc");
            }
        });

        renderTables();
    };

    // CSV Export functionality
    window.exportToCSV = function() {
        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        let filename = "expense_report.csv";

        if (currentTab === "overview") {
            filename = "consolidated_overview.csv";
            csvContent += "ลำดับ,ชื่อโรงงาน,ค่าใช้จ่ายสะสม (บาท),คงที่ตามสัญญา (บาท),แปรผันตามการใช้งาน (บาท),อื่นๆ (บาท),เงินยืมทดรองจ่าย (บาท)\n";
            DASHBOARD_DATA.forEach((f, idx) => {
                const stats = calculateStats(f.ShortName);
                csvContent += `${idx + 1},"${f.FactoryName}",${stats.totalCost},${stats.fixedCost},${stats.variableCost},${stats.otherCost},${stats.totalAdvance}\n`;
            });
        } else if (currentTab === "advances") {
            filename = "advance_payments_consolidated.csv";
            csvContent += "ลำดับ,โรงงาน,งาน/กิจกรรม,ชื่อผู้ยืม,ม.ค.,ก.พ.,มี.ค.,เม.ย.,พ.ค.,รวมยืมสะสม (บาท)\n";
            let idx = 1;
            DASHBOARD_DATA.forEach(f => {
                f.AdvanceItems.forEach(item => {
                    csvContent += `${idx},"${f.ShortName}","${item.Activity}","${item.Borrower}",${item.Months.jan},${item.Months.feb},${item.Months.mar},${item.Months.apr},${item.Months.may},${item.Total}\n`;
                    idx++;
                });
            });
        } else {
            const factory = getFactoryData(currentTab);
            if (!factory) return;
            filename = `${factory.ShortName}_expense_details.csv`;
            csvContent += "ลำดับ,รายการค่าใช้จ่าย,ประเภทค่าใช้จ่าย,ม.ค.,ก.พ.,มี.ค.,เม.ย.,พ.ค.,รวมสะสม (บาท)\n";
            factory.MainItems.forEach(item => {
                csvContent += `"${item.No || ""}","${item.Item}","${item.Type || "ทั่วไป"}",${item.Months.jan},${item.Months.feb},${item.Months.mar},${item.Months.apr},${item.Months.may},${item.Total}\n`;
            });
        }

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Helper: Number Formatter
    function formatNumber(num) {
        if (num === 0) return "-";
        
        let formatted = Math.abs(num).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        
        return num < 0 ? `(${formatted})` : formatted;
    }

    function formatCellNumber(num) {
        if (num === 0) return "-";
        return formatNumber(num);
    }

    function formatCompactNumber(num) {
        const absNum = Math.abs(num);
        let suffix = "";
        let divided = absNum;

        if (absNum >= 1000000) {
            suffix = "M";
            divided = absNum / 1000000;
        } else if (absNum >= 1000) {
            suffix = "K";
            divided = absNum / 1000;
        }

        let formatted = divided.toLocaleString('en-US', {
            maximumFractionDigits: 1
        }) + suffix;

        return num < 0 ? `-${formatted}` : formatted;
    }
});
