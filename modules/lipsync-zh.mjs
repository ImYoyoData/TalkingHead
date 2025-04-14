/**
* @class 中文唇形同步处理器
* @author Yoyo 
* Email：1294858802@qq.com
*/
/**
 * pinyin 是实际应用中需要使用实际的拼音转换实现
 * npm i pinyin 或者 https://cdn.jsdelivr.net/npm/pinyin@4.0.0-alpha.2/+esm
 */
import pinyin from 'pinyin';

class LipsyncZh {

  /**
  * @constructor
  */
  constructor() {
    // 拼音到viseme的映射
    this.visemes = {
      // 韵母映射
      'a': 'aa', 'o': 'O', 'e': 'E', 'ê': 'E',
      'ai': 'aa', 'ei': 'E', 'ao': 'aa', 'ou': 'O',
      'an': 'aa', 'en': 'E', 'ang': 'aa', 'eng': 'E',
      'er': 'RR', 'i': 'I', 'ia': 'aa', 'ie': 'E',
      'iao': 'I', 'iu': 'I', 'ian': 'I', 'in': 'I',
      'iang': 'aa', 'ing': 'I', 'u': 'U', 'ü': 'U',
      'ua': 'aa', 'uo': 'O', 'uai': 'aa', 'ui': 'U',
      'uan': 'aa', 'un': 'U', 'uang': 'aa', 'ong': 'O',

      // 声母映射
      'b': 'PP', 'p': 'PP', 'm': 'PP', 'f': 'FF',
      'd': 'DD', 't': 'DD', 'n': 'nn', 'l': 'nn',
      'g': 'kk', 'k': 'kk', 'h': 'kk',
      'j': 'SS', 'q': 'SS', 'x': 'SS',
      'zh': 'SS', 'ch': 'SS', 'sh': 'SS', 'r': 'RR',
      'z': 'SS', 'c': 'SS', 's': 'SS'
    };

    // Viseme相对持续时间
    this.visemeDurations = {
      'aa': 1.2, 'E': 1.0, 'I': 0.8, 'O': 1.0,
      'U': 0.9, 'PP': 0.7, 'SS': 1.0, 'DD': 0.8,
      'FF': 0.9, 'kk': 0.7, 'nn': 0.8, 'RR': 0.8,
      'sil': 1
    };

    // 特殊符号处理
    this.symbols = {
      '%': '百分之', '€': '欧元', '$': '美元',
      '℃': '摄氏度', 'm²': '平方米'
    };
    this.symbolsReg = /[%€$℃²]/g;

    // 中文数字系统
    this.digits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
    this.units = ['', '十', '百', '千', '万', '十', '百', '千', '亿'];
  }

  /**
  * 数字转中文
  * @param {string} num 数字字符串
  * @return {string} 中文数字
  */
  numberToChinese(num) {
    let str = '';
    const n = num.split('.');
    let integer = n[0], decimal = n[1] || '';

    // 处理整数部分
    for (let i = 0; i < integer.length; i++) {
      const digit = parseInt(integer[i]);
      const unit = this.units[integer.length - 1 - i];
      if (digit === 0) {
        if (str.slice(-1) !== '零') str += this.digits[digit];
      } else {
        str += this.digits[digit] + unit;
      }
    }

    // 处理小数部分
    if (decimal) {
      str += '点';
      for (let d of decimal) {
        str += this.digits[parseInt(d)] + ' ';
      }
    }

    return str.replace(/零+/g, '零').replace(/零$/, '').trim();
  }

  /**
  * 文本预处理
  * @param {string} s 原始文本
  * @return {string} 处理后的文本
  */
  preProcessText(s) {
    return s
      .replace(/[#_*\'\":;]/g, '')  // 移除不需要的符号
      .replace(this.symbolsReg, m => this.symbols[m] || m) // 替换符号
      .replace(/(\d+)℃/g, (m, p1) => this.numberToChinese(p1) + '摄氏度') // 温度处理
      .replace(/(\d+)m²/g, (m, p1) => this.numberToChinese(p1) + '平方米') // 面积处理
      .replace(/(\d+\.?\d*)/g, m => this.numberToChinese(m)) // 数字转中文
      .normalize('NFKC') // Unicode正规化
      .replace(/[，。？！]/g, ' ') // 标点转空格
      .replace(/\s+/g, ' ') // 合并空格
      .trim();
  }

  /**
  * 转换中文到viseme序列
  * @param {string} w 处理后的文本
  * @return {Object} 唇形数据
  */
  wordsToVisemes(w) {
    const output = { visemes: [], times: [], durations: [] };
    let time = 0;

    // 汉字转拼音
    const pinyins = this.chineseToPinyin(w);

    for (let pinyin of pinyins) {
      // 分割声母和韵母
      const [initial, final] = this.splitPinyin(pinyin);

      // 处理声母
      if (initial) {
        const v = this.visemes[initial];
        if (v) {
          this.addViseme(output, v, time);
          time += this.visemeDurations[v] || 1;
        }
      }

      // 处理韵母
      if (final) {
        const v = this.visemes[final];
        if (v) {
          this.addViseme(output, v, time);
          time += this.visemeDurations[v] || 1;
        }
      }

      // 添加间隔
      time += 0.2;
    }

    return output;
  }

  // 辅助方法：添加viseme并合并连续相同项
  addViseme(output, viseme, time) {
    const last = output.visemes.length - 1;
    if (last >= 0 && output.visemes[last] === viseme) {
      output.durations[last] += this.visemeDurations[viseme] || 1;
    } else {
      output.visemes.push(viseme);
      output.times.push(time);
      output.durations.push(this.visemeDurations[viseme] || 1);
    }
  }

  // 示例拼音转换
  chineseToPinyin(text) {
    return pinyin(text, {
      style: pinyin.STYLE_NORMAL, // 不带声调
      heteronym: false           // 不启用多音字
    }).map(arr => arr[0]);       // 取第一个读音
  }

  // 分割声母韵母（示例实现）
  splitPinyin(pinyin) {
    const initials = ['b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h',
      'j', 'q', 'x', 'zh', 'ch', 'sh', 'r', 'z', 'c', 's'];
    for (let init of initials) {
      if (pinyin.startsWith(init)) {
        return [init, pinyin.slice(init.length)];
      }
    }
    return ['', pinyin];
  }
}

export { LipsyncZh };
