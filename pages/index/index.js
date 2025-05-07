// 定义常量
const API_BASE_URL = 'https://www.sobds.com'
const API_KEY = '填入自己申请的API_KEY'
const API_SECRET = '填入自己申请的API_SECRET'

Page({
  data: {
    items: [],
    currentItem: 0,
    deviceInfo: null,
    locationData: null,
    receivedData: [],
    deviceAuthenticated: false,
    longitude: '',
    latitude: '',
    radio: '102.8',
    // 新增数据
    appToken: '',
    sdkToken: '',
    key: API_KEY,
    hostAppId: '',
    hasSdkToken: false,
    sdkTokenExpireTime: 0
  },

  onLoad() {
    // 获取位置信息
    this.getLocation()
  },

  // 获取位置信息
  getLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({
          longitude: res.longitude.toString(),
          latitude: res.latitude.toString()
        });
      },
      fail: (err) => {
        console.error('获取位置失败:', err);
        wx.showToast({
          title: '获取位置失败，请检查位置权限',
          icon: 'none'
        });
      }
    });
  },

  // 获取AppToken
  getAppToken() {
    return new Promise((resolve, reject) => {
      const jsonRequest = {
        key: API_KEY,
        secret: API_SECRET
      };

      wx.request({
        url: `${API_BASE_URL}/Api/Yc/getToken`,
        method: 'POST',
        data: jsonRequest,
        success: (res) => {
          const data = res.data;
          if (data.code === 200) {
            const token = data.data.token;
            console.log('获取应用Token成功:', token);
            this.setData({ appToken: token });
            resolve(token);
          } else {
            const errorMsg = `获取应用Token失败，无法连接caster ${data.msg}`;
            console.error(errorMsg);
            wx.showToast({
              title: errorMsg,
              icon: 'none'
            });
            reject(new Error(errorMsg));
          }
        },
        fail: (err) => {
          const errorMsg = `获取应用Token失败，无法连接caster: ${err.errMsg}`;
          console.error(errorMsg, err);
          wx.showToast({
            title: errorMsg,
            icon: 'none'
          });
          reject(new Error(errorMsg));
        }
      });
    });
  },

  // 获取SDK Token
  getSdkToken() {
    // 先检查是否有位置信息
    if (!this.data.longitude || !this.data.latitude) {
      wx.showToast({
        title: '请先获取位置信息',
        icon: 'none'
      });
      
      // 重新获取位置信息
      this.getLocation();
      return;
    }

    // 检查是否已过期
    const currentSeconds = Math.floor(Date.now() / 1000);
    if (currentSeconds < this.data.sdkTokenExpireTime) {
      console.log('SDK Token未过期，无需重新获取');
      wx.showToast({
        title: 'SDK Token有效',
        icon: 'success'
      });
      return;
    }

    // 显示加载提示
    wx.showLoading({
      title: '获取Token中...',
    });

    // 先获取AppToken
    this.getAppToken()
      .then(appToken => {

        // 请注意hostAppId 
        const hostAppId = Date.now().toString();
        this.setData({ hostAppId });

        // 模拟用户ID
        
        // 使用AppToken获取SDK Token
        return new Promise((resolve, reject) => {
          const jsonRequest = {
            userId: hostAppId
          };

          wx.request({
            url: `${API_BASE_URL}/Api/Yc/getSdkToken`,
            method: 'POST',
            data: jsonRequest,
            header: {
              'token': appToken
            },
            success: (res) => {
              const data = res.data;
              if (data.code === 200) {
                const sdkToken = data.data.token;
                const expireTime = data.data.expireTime;
                const sdkTokenExpireTime = Math.floor(Date.now() / 1000) + expireTime;
                
                console.log('获取SDK Token成功:', sdkToken);
                console.log('过期时间:', new Date(sdkTokenExpireTime * 1000));
                
                this.setData({ 
                  sdkToken,
                  sdkTokenExpireTime,
                  hasSdkToken: true
                });
                
                wx.hideLoading();
                wx.showToast({
                  title: '获取SDK Token成功',
                  icon: 'success'
                });
                
                resolve(sdkToken);
              } else {
                const errorMsg = `获取SDK Token失败: ${data.msg}`;
                console.error(errorMsg);
                wx.hideLoading();
                wx.showToast({
                  title: errorMsg,
                  icon: 'none'
                });
                reject(new Error(errorMsg));
              }
            },
            fail: (err) => {
              const errorMsg = `获取SDK Token失败: ${err.errMsg}`;
              console.error(errorMsg, err);
              wx.hideLoading();
              wx.showToast({
                title: errorMsg,
                icon: 'none'
              });
              reject(new Error(errorMsg));
            }
          });
        });
      })
      .catch(error => {
        wx.hideLoading();
        console.error('获取Token流程失败:', error);
      });
  },

  addItem() {
    this.data.items.push(this.data.currentItem++)
    this.setData({
      items: this.data.items,
      currentItem: this.data.currentItem
    })
  },

  // 获取esurvey组件实例
  getEsurveyComponent() {
    const esurveyComponent = this.selectComponent('#esurveyComponent');
    if (!esurveyComponent) {
      console.error('未找到esurvey组件');
      wx.showToast({
        title: '组件加载失败',
        icon: 'none'
      });
      return null;
    }
    return esurveyComponent;
  },

  // 开始蓝牙扫描
  startBluetoothScan() {
    // 检查是否有SDK Token
    if (!this.data.hasSdkToken) {
      wx.showToast({
        title: '请先获取SDK Token',
        icon: 'none'
      });
      return;
    }
    
    const esurveyComponent = this.getEsurveyComponent();
    if (esurveyComponent) {
      esurveyComponent.startBluetoothScan();
    }
  },

  // 断开蓝牙连接
  disconnectBluetooth() {
    const esurveyComponent = this.getEsurveyComponent();
    if (esurveyComponent) {
      esurveyComponent.disconnectBluetooth();
    }
  },

  // 发送数据到蓝牙设备
  sendDataToBluetooth(data) {
    const esurveyComponent = this.getEsurveyComponent();
    if (esurveyComponent && esurveyComponent.isConnected()) {
      esurveyComponent.sendDataToBluetooth(data);
    } else {
      wx.showToast({
        title: '设备未连接',
        icon: 'none'
      });
    }
  },

  // 连接成功回调
  onConnectSuccess(e) {
    console.log('设备连接成功', e.detail);
    this.setData({
      deviceInfo: e.detail.deviceInfo
    });
    
    wx.showToast({
      title: '设备连接成功',
      icon: 'success'
    });
  },

  // 设备状态变化回调
  onDeviceStatusChange(e) {
    console.log('设备状态变化', e.detail);
    
    // 如果设备连接成功但未通过认证
    if (e.detail.connected && e.detail.hasOwnProperty('authenticated')) {
      this.setData({
        deviceAuthenticated: e.detail.authenticated
      });
      
      if (e.detail.authenticated) {
        console.log('设备连接和认证都已成功');
      } else if (e.detail.errorMessage) {
        console.error('设备认证失败:', e.detail.errorMessage);
      }
    }
  },

  // 连接失败回调
  onConnectFail(e) {
    console.error('设备连接失败', e.detail);
    wx.showToast({
      title: '连接失败: ' + e.detail.error,
      icon: 'none'
    });
  },

  // 断开连接回调
  onDisconnect() {
    console.log('设备已断开连接');
    this.setData({
      deviceInfo: null,
      locationData: null
    });
    
    wx.showToast({
      title: '设备已断开',
      icon: 'none'
    });
  },

  // 位置数据更新回调
  onLocationUpdate(e) {
    this.setData({
      locationData: e.detail
    });
  },

  // 添加认证结果回调
  onAuthenticationResult(e) {
    console.log('认证结果', e.detail);
    if (e.detail.success) {
      wx.showToast({
        title: '认证成功: ' + e.detail.message,
        icon: 'success'
      });
    } else {
      wx.showToast({
        title: '认证失败: ' + e.detail.message,
        icon: 'none'
      });
    }
  }
})
