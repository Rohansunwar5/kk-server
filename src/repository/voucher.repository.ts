import voucherModel from "../models/voucher.model";

export interface CreateVoucherParams {
    name: string;
    code: string;
    amount: number;
    minimumValue: number;
    startFrom: Date;
    validUpto: Date;
    createdBy?: string;
}

export interface UpdateVoucherParams {
    name?: string;
    code?: string;
    amount?: number;
    minimumValue?: number;
    startFrom?: Date;
    validUpto?: Date;
}

export interface GetAllVouchersParams {
    page: number;
    limit: number;
    used?: boolean;
    searchTerm?: string;
}

export class VoucherRepository {
    private _model = voucherModel;

    async createVoucher(params: CreateVoucherParams) {
        return this._model.create(params);
    }

    async deleteVoucher(id: string) {
        return this._model.findByIdAndDelete(id);
    }

    async updateVoucher(id: string, params: UpdateVoucherParams) {
        return this._model.findByIdAndUpdate(
            id, 
            params, 
            { new: true }
        );
    }

    async getVoucherById(id: string) {
        return this._model.findById(id);
    }

    async getVoucherByCode(code: string) {
        const voucher = await this._model.findOne({ code });
        if (!voucher) return null;
        
        const plainVoucher = voucher.toObject();
        return {
            ...plainVoucher,
            _id: plainVoucher._id.toString()
        };
    }

    async getAvailableVouchers() {
        const now = new Date();
        return this._model.find({
            used: false,
            startFrom: { $lte: now },
            validUpto: { $gte: now }
        }).sort({ createdAt: -1 });
    }

    async getAllVouchers(params: GetAllVouchersParams) {
        const { 
            page, 
            limit, 
            used,
            searchTerm
        } = params;

        const skip = (page - 1) * limit;
        const filter: any = {};

        if (typeof used === 'boolean') {
            filter.used = used;
        }

        if (searchTerm) {
            filter.$or = [
                { code: { $regex: searchTerm, $options: 'i' } },
                { name: { $regex: searchTerm, $options: 'i' } }
            ];
        }

        const [vouchers, total] = await Promise.all([
            this._model
                .find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            this._model.countDocuments(filter)
        ]);

        return {
            vouchers,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            limit
        };
    }

    async markAsUsed(code: string, userId: string) {
        return this._model.findOneAndUpdate(
            { code, used: false },
            { 
                $set: { 
                    used: true,
                    usedBy: userId
                }
            },
            { new: true }
        );
    }

    async getExpiredVouchers(page: number = 1, limit: number = 10) {
        const skip = (page - 1) * limit;
        const now = new Date();
        
        const [vouchers, total] = await Promise.all([
            this._model
                .find({ 
                    validUpto: { $lt: now },
                    used: false
                })
                .sort({ validUpto: -1 })
                .skip(skip)
                .limit(limit),
            this._model.countDocuments({ 
                validUpto: { $lt: now },
                used: false
            })
        ]);

        return {
            vouchers,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page
        };
    }

    async getVoucherStats() {
        const [total, used, available, expired] = await Promise.all([
            this._model.countDocuments({}),
            this._model.countDocuments({ used: true }),
            this._model.countDocuments({ 
                used: false,
                startFrom: { $lte: new Date() },
                validUpto: { $gte: new Date() }
            }),
            this._model.countDocuments({ 
                validUpto: { $lt: new Date() },
                used: false
            })
        ]);

        return {
            total,
            used,
            available,
            expired
        };
    }

    async hasUserUsedVoucher(code: string, userId: string): Promise<boolean> {
        const voucher = await this._model.findOne({ 
            code,
            usedBy: userId 
        });
        return voucher !== null;
    }
}