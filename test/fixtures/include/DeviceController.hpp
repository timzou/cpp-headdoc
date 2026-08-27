#pragma once

class DeviceController
{
public:
    /**
     * @brief 启动 FPGA 数据采集
     *
     * 根据指定的采样频率和通道启动实时数据采集。
     *
     * @param[in] sampleRate 采样频率，单位为 Hz
     * @param[in] channel 采集通道编号
     * @return 启动成功返回 true，否则返回 false
     */
    bool startAcquisition(int sampleRate, int channel);

    /// @brief 停止数据采集
    /// @return 停止成功返回 true
    bool stopAcquisition() noexcept;

    bool undocumented() const;
};
