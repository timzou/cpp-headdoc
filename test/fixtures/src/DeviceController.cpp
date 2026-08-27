#include "../include/DeviceController.hpp"

bool DeviceController::startAcquisition(int sampleRate, int channel)
{
    return sampleRate > 0 && channel >= 0;
}

bool DeviceController::stopAcquisition() noexcept
{
    return true;
}

bool DeviceController::undocumented() const
{
    return false;
}
