const JSZip = require('jszip')

let zip = null

const downloadMailAndZip = async (msg, initialFolder) => {
	const mail = messenger.messages.getRaw(msg.id)
	const folder = `${msg.folder.path}/`.replace(initialFolder, '');
	zip.file(`${folder}${msg.id}_${msg.subject.replace(/\//g, '_')}.eml`, (await mail).toString());
}

const scanFolder = async folder => {
	const mailListGenerator = listMessages(folder)
	const initialFolder = folder.path + "/"

	const pendingPromises = []

	for await (let msg of mailListGenerator)
		pendingPromises.push(downloadMailAndZip(msg, initialFolder))

	await Promise.all(pendingPromises)

	const zipFile = await zip.generateAsync({ type: 'blob' })

	let url = URL.createObjectURL(zipFile)
	messenger.downloads.download({filename: `${folder.name}.zip`, saveAs: true, url}, async id => {
		zip = null
	});
}

const exportMessages = async messages => {
	const pendingPromises = []

	for (let msg of messages)
		pendingPromises.push(downloadMailAndZip(msg, '/'))

	await Promise.all(pendingPromises)

	const zipFile = await zip.generateAsync({ type: 'blob' })

	let url = URL.createObjectURL(zipFile)
	messenger.downloads.download({filename: `mails.zip`, saveAs: true, url}, id => {
		zip = null
	});
}

const handleClick = clickData => {
	zip = JSZip()
	if ('selectedMessages' in clickData) {
		exportMessages(clickData.selectedMessages.messages)
	} else if ('selectedFolder' in clickData) {
		scanFolder(clickData.selectedFolder)
	}
}

async function* listMessages(folder) {
	let page = await messenger.messages.list(folder);
	for (let message of page.messages) {
		yield message;
	}

	while (page.id) {
		page = await messenger.messages.continueList(page.id);
		for (let message of page.messages) {
			yield message;
		}
	}

	for (subFolder of folder.subFolders) {
		yield* listMessages(subFolder)
	}
}


messenger.menus.create({
	title: messenger.i18n.getMessage("menuTitle"),
	contexts: ["message_list", "folder_pane"],
	onclick: handleClick
})