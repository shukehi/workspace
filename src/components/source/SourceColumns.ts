
// Column definition for the massive Source Table
export const sourceColumns = [
    { key: 'productModelName', label: '产品名称', width: 200 },
    { key: 'spec', label: '规格/洞口尺寸', width: 140 },
    { key: 'qty', label: '数量', width: 80 },
    { key: 'color', label: '颜色', width: 100 },

    // Core Specs
    { key: 'mb', label: '门边' },
    { key: 'mshd', label: '门扇厚度' },

    // Locks & Hardware
    { key: 'sj', label: '锁具', width: 120 },
    { key: 'sx', label: '锁芯' },
    { key: 'sxhz', label: '锁芯护罩' },
    { key: 'sc', label: '锁叉' },
    { key: 'ml', label: '门铃' },
    { key: 'my', label: '猫眼' },
    { key: 'jl', label: '铰链' },

    // Secondary Locks
    { key: 'fssj', label: '副锁锁具', width: 120 },
    { key: 'fssx', label: '副锁锁芯' },
    { key: 'fshz', label: '副锁护罩' },

    // Components
    { key: 'bs', label: '边锁' },
    { key: 'tc', label: '填充' },
    { key: 'pt', label: '皮条' },
    { key: 'bz', label: '包装' },
    { key: 'ls', label: '拉手' },
    { key: 'tyls', label: '通用拉手' },

    // Meta
    { key: 'xsbz', label: '备注', width: 150 },
    { key: 'qbbc', label: '前/后/门架' },
    { key: 'jb', label: '级别' },
    { key: 'xd', label: '下档' }
];
