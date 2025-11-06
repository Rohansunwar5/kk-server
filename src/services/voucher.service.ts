import { BadRequestError } from "../errors/bad-request.error";
import { InternalServerError } from "../errors/internal-server.error";
import { NotFoundError } from "../errors/not-found.error";
import { 
    CreateVoucherParams, 
    UpdateVoucherParams, 
    VoucherRepository
} from "../repository/voucher.repository";

export interface GetAllVouchersOptions {
    page?: number;
    limit?: number;
    used?: boolean;
    searchTerm?: string;
}

export interface ApplyVoucherParams {
    code: string;
    subtotal: number;
}

export interface VoucherApplicationResult {
    discountAmount: number;
    discountedTotal: number;
    appliedVoucher: {
        code: string;
        name: string;
        amount: number;
        voucherId: string;
    };
}

class VoucherService {
    constructor(private readonly _voucherRepository: VoucherRepository) {}

    async createVoucher(params: CreateVoucherParams) {
        const existingVoucher = await this._voucherRepository.getVoucherByCode(params.code);
        if (existingVoucher) {
            throw new BadRequestError('Voucher code already exists');
        }

        if (new Date(params.validUpto) <= new Date()) {
            throw new BadRequestError('Valid upto date must be in the future');
        }

        if (params.amount <= 0) {
            throw new BadRequestError('Voucher amount must be greater than 0');
        }

        if (params.minimumValue < 0) {
            throw new BadRequestError('Minimum value cannot be negative');
        }

        if (params.minimumValue > 0 && params.amount >= params.minimumValue) {
            throw new BadRequestError('Voucher amount should be less than minimum purchase value');
        }

        if (new Date(params.startFrom) >= new Date(params.validUpto)) {
            throw new BadRequestError('Start date must be before valid upto date');
        }

        const voucher = await this._voucherRepository.createVoucher(params);
        if (!voucher) {
            throw new InternalServerError('Failed to create voucher');
        }

        return voucher;
    }

    async updateVoucher(id: string, params: UpdateVoucherParams) {
        const voucher = await this._voucherRepository.getVoucherById(id);
        if (!voucher) {
            throw new NotFoundError('Voucher not found');
        }

        if (voucher.used) {
            throw new BadRequestError('Cannot update a used voucher');
        }

        if (params.code && params.code !== voucher.code) {
            const existingVoucher = await this._voucherRepository.getVoucherByCode(params.code);
            if (existingVoucher) {
                throw new BadRequestError('Voucher code already exists');
            }
        }

        if (params.amount !== undefined && params.amount <= 0) {
            throw new BadRequestError('Voucher amount must be greater than 0');
        }

        if (params.minimumValue !== undefined && params.minimumValue < 0) {
            throw new BadRequestError('Minimum value cannot be negative');
        }

        if (params.startFrom && params.validUpto && 
            new Date(params.startFrom) >= new Date(params.validUpto)) {
            throw new BadRequestError('Start date must be before valid upto date');
        }

        const updatedVoucher = await this._voucherRepository.updateVoucher(id, params);
        if (!updatedVoucher) {
            throw new InternalServerError('Failed to update voucher');
        }

        return updatedVoucher;
    }

    async getVoucherById(id: string) {
        const voucher = await this._voucherRepository.getVoucherById(id);
        if (!voucher) {
            throw new NotFoundError('Voucher not found');
        }
        return voucher;
    }

    async getVoucherByCode(code: string) {
        const voucher = await this._voucherRepository.getVoucherByCode(code);
        if (!voucher) {
            throw new NotFoundError('Voucher code not found');
        }
        return voucher;
    }

    async getAvailableVouchers() {
        return this._voucherRepository.getAvailableVouchers();
    }

    async getAllVouchers(options: GetAllVouchersOptions = {}) {
        const { 
            page = 1, 
            limit = 10, 
            used,
            searchTerm
        } = options;

        if (page < 1) {
            throw new BadRequestError('Page must be greater than 0');
        }
        if (limit < 1 || limit > 100) {
            throw new BadRequestError('Limit must be between 1 and 100');
        }

        return this._voucherRepository.getAllVouchers({
            page,
            limit,
            used,
            searchTerm
        });
    }

    async applyVoucher(params: ApplyVoucherParams): Promise<VoucherApplicationResult> {
        const { code, subtotal } = params;
        
        const voucher = await this.getVoucherByCode(code);
        
        this.validateVoucher(voucher, subtotal);

        const discountAmount = voucher.amount;
        const discountedTotal = subtotal - discountAmount;

        return {
            discountAmount: Math.round(discountAmount * 100) / 100,
            discountedTotal: Math.round(discountedTotal * 100) / 100,
            appliedVoucher: {
                code: voucher.code,
                name: voucher.name,
                amount: voucher.amount,
                voucherId: voucher._id
            }
        };
    }

    private validateVoucher(voucher: any, subtotal: number) {
        const now = new Date();

        if (voucher.used) {
            throw new BadRequestError('Voucher has already been used');
        }

        if (now < new Date(voucher.startFrom)) {
            throw new BadRequestError('Voucher is not yet valid');
        }

        if (now > new Date(voucher.validUpto)) {
            throw new BadRequestError('Voucher has expired');
        }

        if (subtotal < voucher.minimumValue) {
            throw new BadRequestError(`Minimum purchase of ${voucher.minimumValue} required`);
        }

        if (voucher.amount > subtotal) {
            throw new BadRequestError('Voucher amount exceeds cart total');
        }
    }

    async markVoucherAsUsed(code: string, userId: string) {
        // Check if user has already used this voucher
        const hasUsed = await this._voucherRepository.hasUserUsedVoucher(code, userId);
        if (hasUsed) {
            throw new BadRequestError('You have already used this voucher');
        }

        const voucher = await this.getVoucherByCode(code);
        
        if (voucher.used) {
            throw new BadRequestError('Voucher has already been used');
        }

        const now = new Date();
        if (now < new Date(voucher.startFrom)) {
            throw new BadRequestError('Voucher is not yet valid');
        }

        if (now > new Date(voucher.validUpto)) {
            throw new BadRequestError('Voucher has expired');
        }

        const updatedVoucher = await this._voucherRepository.markAsUsed(code, userId);
        if (!updatedVoucher) {
            throw new InternalServerError('Failed to mark voucher as used');
        }

        return updatedVoucher;
    }

    async deleteVoucher(id: string) {
        const voucher = await this._voucherRepository.getVoucherById(id);
        if (!voucher) {
            throw new NotFoundError('Voucher not found');
        }

        if (voucher.used) {
            throw new BadRequestError('Cannot delete a used voucher');
        }

        const response = await this._voucherRepository.deleteVoucher(id);
        if (!response) {
            throw new InternalServerError('Failed to delete voucher');
        }

        return { message: 'Voucher deleted successfully' };
    }

    async getExpiredVouchers(page: number = 1, limit: number = 10) {
        return this._voucherRepository.getExpiredVouchers(page, limit);
    }

    async getVoucherStats() {
        return this._voucherRepository.getVoucherStats();
    }
}

export default new VoucherService(new VoucherRepository());