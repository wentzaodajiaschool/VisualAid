let stream;
let recognition;
let recognizing = false;       // 表示當前是否正在識別
let shouldReallyStop = false; // 表示是否真的要停止識別
let isFlipped = false;
let currentDeviceId = "";
let currentCameraIndex = 0;  // 新增: 當前鏡頭索引
let isVerticallyFlipped = false;  // 表示是否已上下顛倒

let rotationAngle = 0;
let perspectiveValue = 0;
let yScaleValue = 1; // 預設為1，表示沒有縮放
let xScaleValue = 1; // 預設為1，表示沒有縮放

function updateVideoPerspective() {
	let scaleXDirectionValue = isFlipped ? '-1' : '1';
	let scaleYDirectionValue = isVerticallyFlipped ? `${yScaleValue * -1}` : yScaleValue.toString();
	document.getElementById('video').style.transform = `
		translate(-50%, -50%) 
		scaleX(${scaleXDirectionValue * xScaleValue}) 
		scaleY(${scaleYDirectionValue}) 
		rotate(${rotationAngle}deg) 
		perspective(500px) 
		rotateX(${perspectiveValue}deg)
	`;
}

function increasePerspective() {
	perspectiveValue += 5;  // 每次增加5度
	yScaleValue -= 0.08;    // 每次增加5%的Y軸縮放
	xScaleValue -= 0.05;    // 每次增加5%的X軸縮放
	updateVideoPerspective();
}

function decreasePerspective() {
	perspectiveValue -= 5;  // 每次減少5度
	yScaleValue += 0.08;    // 每次減少5%的Y軸縮放
	xScaleValue += 0.05;    // 每次減少5%的X軸縮放
	updateVideoPerspective();
}

function defaultPerspective() {
	perspectiveValue = 0;
	yScaleValue = 1; // 預設為1，表示沒有縮放
	xScaleValue = 1; // 預設為1，表示沒有縮放
	updateVideoPerspective();
}


// 初始化功能
function init() {
	// 獲取用戶媒體設備權限
	navigator.mediaDevices.getUserMedia({
		video: {
			width: 1920,
			height: 1080,
			frameRate: { min: 30, max: 60 }
		},
		audio: true
	})
	.then(function(mediaStream) {
		const video = document.querySelector('video');
		video.srcObject = mediaStream;
		stream = mediaStream;

		// 檢查瀏覽器是否支援語音識別
		if ('webkitSpeechRecognition' in window) {
			recognition = new webkitSpeechRecognition();
			recognition.continuous = true; // 持續識別
			recognition.interimResults = true; // 暫時結果

			// 語音識別開始時
			recognition.onstart = function() {
				recognizing = true;
			};

			// 收到語音識別結果時
			recognition.onresult = function(event) {
				let interim_transcript = '';
				for (let i = event.resultIndex; i < event.results.length; ++i) {
					if (event.results[i].isFinal) {
						document.getElementById("transcript").textContent = event.results[i][0].transcript;
						setTimeout(function() {
							document.getElementById("transcript").textContent = '';
						}, 3000);
					} else {
						interim_transcript = event.results[i][0].transcript;
					}
				}
				document.getElementById("transcript").textContent = interim_transcript;
			};

			// 語音識別結束時
			recognition.onend = function() {
				if (!shouldReallyStop) {
					recognition.start();
				} else {
					recognizing = false;
					document.getElementById('recognitionButton').querySelector('.button-text').textContent = '開始字幕';
				}
			};

			// 語音識別錯誤時
			recognition.onerror = function(event) {
				console.error("語音識別錯誤: ", event.error);
			};
		} else {
			alert("您的瀏覽器不支援語音識別。建議使用Chrome。");
		}
	})
	.catch(function(err) {
		console.error("設備訪問錯誤: ", err);
	});
}

// 切換語音識別的開始和停止
function toggleRecognition() {
	const buttonText = document.getElementById('recognitionButton').querySelector('.button-text');
	if (recognizing) {
		shouldReallyStop = true;
		recognition.stop();
		buttonText.textContent = '開始字幕';
	} else {
		shouldReallyStop = false;
		recognition.start();
		buttonText.textContent = '字幕辨識中';
	}
}



function updateVideoTransform() {
	let scaleXValue = isFlipped ? '-1' : '1';
	let scaleYValue = isVerticallyFlipped ? '-1' : '1';
	document.getElementById('video').style.transform = `translate(-50%, -50%) scaleX(${scaleXValue}) scaleY(${scaleYValue})`;
}

// 翻轉鏡頭功能
function toggleCamera() {
	isFlipped = !isFlipped;
	updateVideoTransform();
}

// 上下顛倒鏡頭功能
function toggleVerticalFlip() {
	isVerticallyFlipped = !isVerticallyFlipped;
	updateVideoTransform();
}

// 調整字體大小功能 (縮小)
function decreaseFontSize() {
	const transcriptDiv = document.getElementById('transcript');
	const currentSize = window.getComputedStyle(transcriptDiv, null).getPropertyValue('font-size');
	const newSize = parseFloat(currentSize) - 5;
	transcriptDiv.style.fontSize = `${newSize}px`;
}

// 調整字體大小功能 (放大)
function increaseFontSize() {
	const transcriptDiv = document.getElementById('transcript');
	const currentSize = window.getComputedStyle(transcriptDiv, null).getPropertyValue('font-size');
	const newSize = parseFloat(currentSize) + 5;
	transcriptDiv.style.fontSize = `${newSize}px`;
}

// 切換鏡頭按鈕顯示控制
function updateCameraButtonStatus(videoInputDeviceIds) {
	const switchButton = document.getElementById("switchCameraButton"); // 請確認此ID與您的HTML中的ID匹配

	if (videoInputDeviceIds.length <= 1) {
		switchButton.disabled = true;
		switchButton.textContent = "只有一個鏡頭";
	} else {
		switchButton.disabled = false;
		switchButton.textContent = `切換到鏡頭 #${currentCameraIndex + 1}`;
	}
}

// 切換攝影機裝置功能
function switchCamera() {
	if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
		console.log("此瀏覽器不支援切換鏡頭功能！");
		return;
	}

	navigator.mediaDevices.enumerateDevices()
	.then(devices => {
		let videoInputDeviceIds = devices.filter(device => device.kind === 'videoinput').map(device => device.deviceId);

		updateCameraButtonStatus(videoInputDeviceIds);

		if (videoInputDeviceIds.length <= 1) {
			return;
		}

		// 更新鏡頭索引以切換到下一個鏡頭
		currentCameraIndex = (currentCameraIndex + 1) % videoInputDeviceIds.length;
		currentDeviceId = videoInputDeviceIds[currentCameraIndex];

		let constraints = {
			video: {
				deviceId: currentDeviceId,
				width: 1920,
				height: 1080
			}
		};

		return navigator.mediaDevices.getUserMedia(constraints);
	})
	.then(newStream => {
		if (!newStream) return; // 如果只有一個鏡頭，就不做後續的操作

		const video = document.querySelector('video');
		video.srcObject = newStream;

		if (stream) {
			let oldTracks = stream.getTracks();
			oldTracks.forEach(track => track.stop());
		}

		stream = newStream;
	})
	.catch(error => {
		console.error("在切換鏡頭時出錯：", error);
	});
}

// 確認初始化鏡頭
function determineInitialCameraIndex(videoInputDeviceIds) {
	const track = stream.getVideoTracks()[0];
	if (track) {
		const currentDeviceId = track.getSettings().deviceId;
		currentCameraIndex = videoInputDeviceIds.indexOf(currentDeviceId);
	}
}

// 生成鏡頭按鈕
function generateCameraButtons(videoInputDeviceIds) {
	const buttonGroup = document.getElementById('cameraButtons');
	buttonGroup.innerHTML = ''; // 清空先前的按鈕

	videoInputDeviceIds.forEach((deviceId, index) => {
		const button = document.createElement('button');
		button.textContent = `鏡頭 #${index + 1}`;
		button.onclick = function() {
			switchToCamera(deviceId, index);
		};
		buttonGroup.appendChild(button);
	});

	// 設置第一個鏡頭按鈕為活動狀態
	if (buttonGroup.children.length > 0) {
		buttonGroup.children[0].classList.add('active-camera');
	}
}


// 切換到特定鏡頭
function switchToCamera(deviceId, index) {
	let constraints = {
		video: {
			deviceId: deviceId,
			width: 1920,
			height: 1080
		}
	};

	navigator.mediaDevices.getUserMedia(constraints)
	.then(newStream => {
		const video = document.querySelector('video');
		video.srcObject = newStream;

		if (stream) {
			let oldTracks = stream.getTracks();
			oldTracks.forEach(track => track.stop());
		}

		stream = newStream;
		currentCameraIndex = index;
		updateActiveCameraButton();
	})
	.catch(error => {
		console.error("在切換鏡頭時出錯：", error);
	});
}

// 更新當前活躍的鏡頭按鈕樣式
function updateActiveCameraButton() {
	const buttons = document.querySelectorAll('#cameraButtons button');
	buttons.forEach((btn, idx) => {
		if (idx === currentCameraIndex) {
			btn.classList.add('active-camera');
		} else {
			btn.classList.remove('active-camera');
		}
	});
}

// 控制縮和功能
function toggleControls() {
	const controlsContainer = document.querySelector('.controls-container');
	const buttonIcon = document.querySelector('#toggleControlsButton i');

	if (controlsContainer.classList.contains('collapsed')) {
		controlsContainer.classList.remove('collapsed');
		buttonIcon.classList.remove('fa-arrow-circle-up');
		buttonIcon.classList.add('fa-arrow-circle-down');
	} else {
		controlsContainer.classList.add('collapsed');
		buttonIcon.classList.remove('fa-arrow-circle-down');
		buttonIcon.classList.add('fa-arrow-circle-up');
	}
}


// 更新 window.onload 函數
window.onload = function() {
	init();

	navigator.mediaDevices.enumerateDevices()
	.then(devices => {
		let videoInputDeviceIds = devices.filter(device => device.kind === 'videoinput').map(device => device.deviceId);
		generateCameraButtons(videoInputDeviceIds); // 生成按鈕
		determineInitialCameraIndex(videoInputDeviceIds);
	});

	const eventName = document.getElementById('eventName');
	const resizeHandle = eventName.querySelector('.resizeHandle');

	let isResizing = false;

	resizeHandle.addEventListener('mousedown', function(e) {
		isResizing = true;
		document.addEventListener('mousemove', handleResize);
		document.addEventListener('mouseup', () => {
			isResizing = false;
			document.removeEventListener('mousemove', handleResize);
		});
	});

	function handleResize(e) {
		if (!isResizing) return;
		const newSize = e.clientY - eventName.getBoundingClientRect().top;
		if (newSize > 30) { // minimum size
			eventName.style.fontSize = `${newSize}px`;
			console.log(`Event Name Font Size: ${newSize}px`);
		}
	}
};

function rotateGear() {
	const gearIcon = document.querySelector("#toggleControlsButton i");

	// 使用CSS轉換屬性執行旋轉動畫
	gearIcon.style.transition = "transform 0.5s"; // 設定0.5秒旋轉時間
	gearIcon.style.transform = "rotate(180deg)";

	// 0.5秒後重置旋轉角度，以確保下次點擊時可以再次旋轉
	setTimeout(() => {
		gearIcon.style.transition = "none"; 
		gearIcon.style.transform = "rotate(0deg)";
	}, 500);
}

function togglePictureInPicture() {
  const video = document.getElementById('video');

  if (video !== document.pictureInPictureElement) {
	video.requestPictureInPicture().catch(error => {
	  console.error("Error entering Picture in Picture mode:", error);
	});
  } else {
	document.exitPictureInPicture().catch(error => {
	  console.error("Error exiting Picture in Picture mode:", error);
	});
  }
}
