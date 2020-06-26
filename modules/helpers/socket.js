const socket = {
    send: socketSendData,
}

function socketSendData(request, data, event, channel) {
    const io = request.app.get('io')
    io.sockets.to(channel).emit(event, data)
}

module.exports = socket
