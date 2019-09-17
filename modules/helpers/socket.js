const socket = {
    send: socketSendData
};

function socketSendData(request, data, event, channel) {
    console.log('SENDING');
    const io = request.app.get('io');
    io.sockets.to(channel).emit(event, data);
}

module.exports = socket;
